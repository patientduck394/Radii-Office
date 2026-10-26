;; Radii Collab adapter for Taskra, in ClojureScript! Every task is its own synced unit, so two
;; people can add, tick and edit different tasks at once. Comments ride on the tasks, and
;; teammates show as colored dots on the task they're on! (The sync engine is radii-collab.js!)
(ns taskra.collab
  (:require [clojure.string :as str]
            [taskra.app :as app]))

(def backup-key "taskra_collab_backup")

(defonce picked (atom nil))
(defonce peers-now (atom []))

(defn task->js [t] (clj->js t))
;; NodeLists and JS arrays as Clojure seqs (Scittle leaves out the usual helper for this)
(defn items [x] (seq (js/Array.from x)))
(defn js->task [o] (js->clj o :keywordize-keys true))

(defn update-task [id f]
  (swap! app/state update :tasks (fn [ts] (mapv #(if (= (:id %) id) (f %) %) ts))))

(defn id-from-row [row]
  (when-let [c (.querySelector row ".task-check")]
    (second (re-find #"'([^']+)'" (or (.getAttribute c "onchange") "")))))

(defn start! [RC]
  (let [style (.. js/document -documentElement -style)]
    (doseq [[k v] {"--rc-a" "#a5b4fc" "--rc-b" "#6366f1" "--rc-rim" "#c7d2fe" "--rc-glow" "rgba(99, 102, 241, 0.45)"}]
      (.setProperty style k v)))
  (letfn [(paint []
            (when-let [list (app/$ "tasks-list")]
              (doseq [row (items (.querySelectorAll list ".task-row"))]
                (let [id (id-from-row row)
                      layer (or (.querySelector row ":scope > .rc-tabdots")
                                (let [l (.createElement js/document "div")]
                                  (set! (.-className l) "rc-tabdots")
                                  (set! (.. l -style -cssText) "display:flex;gap:4px;align-items:center;margin-right:6px")
                                  (.insertBefore row l (.querySelector row ".task-actions"))
                                  l))
                      t (app/find-task id)
                      n (count (:comments t))
                      badge (.querySelector row ".rc-count")]
                  (.keyed RC layer (clj->js (for [p @peers-now
                                                  :when (= (some-> p .-cur .-t) id)]
                                              {:key (.-id p) :tag "i" :cls "" :title (.-name p) :html ""
                                               :style (str "background:" (.-color p) ";width:12px;height:12px;border-radius:50%;display:inline-block;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)")})))
                  (.toggle (.-classList row) "rc-picked" (= id @picked))
                  (cond
                    (and (pos? n) badge) (set! (.-textContent badge) (str "💬 " n))
                    (pos? n) (let [b (.createElement js/document "span")]
                               (set! (.-className b) "rc-count")
                               (set! (.. b -style -cssText) "font-size:11px;font-weight:800;color:#6366f1;margin-left:6px")
                               (set! (.-textContent b) (str "💬 " n))
                               (.after (.querySelector row ".task-title") b))
                    badge (.remove badge))))))
          (commit! [] (app/changed!) (paint))
          (label [t] (str "“" (subs (str (:title t)) 0 (min 28 (count (str (:title t))))) "”"))
          (title-of [id] (or (:title (app/find-task id)) ""))
          (split-id [id] (str/split id #"\|"))]
    (let [adapter
          #js {:snapshot (fn [] (let [out #js {}]
                                  (doseq [t (app/tasks)] (aset out (str "t:" (:id t)) (task->js t)))
                                  out))
               :apply (fn []
                        (let [next (->> (items (.unitKeys RC "t:"))
                                        (map #(js->task (js/JSON.parse (js/JSON.stringify (.unit RC %)))))
                                        (filter app/valid-task?)
                                        vec)]
                          (swap! app/state assoc :tasks next)
                          ;; save quietly: this change came FROM the session, so no RC.changed() echo
                          (try (.setItem js/localStorage app/storage-key (js/JSON.stringify (clj->js {:tasks next}))) (catch :default _ nil))
                          (app/render!)
                          (paint)
                          #js []))
               :mergeable (constantly false)
               :begin (fn [mode] (when (= mode "guest") (swap! app/state assoc :tasks []) (app/render!)) (paint))
               :backup (fn [] (try (.setItem js/localStorage backup-key (js/JSON.stringify (clj->js (app/tasks)))) true (catch :default _ false)))
               :hasBackup (fn [] (try (boolean (.getItem js/localStorage backup-key)) (catch :default _ false)))
               :restore (fn []
                          (let [list (js/JSON.parse (or (.getItem js/localStorage backup-key) "null"))]
                            (when (js/Array.isArray list)
                              (swap! app/state assoc :tasks (app/parse-tasks list))
                              (app/changed!)
                              (try (.removeItem js/localStorage backup-key) (catch :default _ nil)))))
               :cursor (fn [] #js {:t @picked})
               :where (fn [cur] (let [n (if (and cur (.-t cur)) (title-of (.-t cur)) "")]
                                  (if (seq n) (str "On \"" (subs n 0 (min 28 (count n))) "\"") "Looking around")))
               :drawCursors (fn [peers] (reset! peers-now (vec (items peers))) (paint))
               :follow (fn [] nil)
               :comments
               #js {:hint "Comment on the task you clicked"
                    :list (fn [] (clj->js (for [t (app/tasks) c (:comments t)]
                                            {:id (str (:id t) "|" (:id c)) :where (label t) :items (:items c)})))
                    :add (fn [text me]
                           (if-not (app/find-task @picked)
                             (do (.toast RC "Click a task first, then write your comment!") false)
                             (do (update-task @picked #(update % :comments (fnil conj [])
                                                               {:id (str "c" (.uid RC 8))
                                                                :items [{:by (.-id me) :name (.-name me) :text text :at (js/Date.now)}]}))
                                 (commit!)
                                 true)))
                    :reply (fn [id text me]
                             (let [[tid cid] (split-id id)]
                               (update-task tid (fn [t] (update t :comments
                                                                (fn [cs] (mapv #(if (= (:id %) cid)
                                                                                  (update % :items conj {:by (.-id me) :name (.-name me) :text text :at (js/Date.now)})
                                                                                  %) cs)))))
                               (commit!)))
                    :resolve (fn [id]
                               (let [[tid cid] (split-id id)]
                                 (update-task tid (fn [t] (let [cs (vec (remove #(= (:id %) cid) (:comments t)))]
                                                            (if (seq cs) (assoc t :comments cs) (dissoc t :comments)))))
                                 (commit!)))
                    :jump (fn [id]
                            (reset! picked (first (split-id id)))
                            (paint)
                            (doseq [r (items (.querySelectorAll js/document "#tasks-list .task-row"))
                                    :when (= (id-from-row r) @picked)]
                              (.scrollIntoView r #js {:block "center" :behavior "smooth"})
                              (.add (.-classList r) "rc-flash")
                              (js/setTimeout #(.remove (.-classList r) "rc-flash") 1300)))}}]
      (.addEventListener js/document "click"
                         (fn [e]
                           (when-let [row (and (.-closest (.-target e)) (.closest (.-target e) ".task-row"))]
                             (reset! picked (id-from-row row))
                             (paint)
                             (.cursorMoved RC))))
      (.init RC #js {:app "taskra" :appName "Taskra" :docName "task list" :adapter adapter})
      ;; every local change goes through persist!, every redraw through render!
      (swap! app/persist-hooks conj #(.changed RC))
      (swap! app/render-hooks conj paint)
      (when-let [tr (.querySelector js/document "#os-title .os-tr")]
        (.insertBefore tr (.shareButton RC) (.-firstChild tr)))
      (when-let [pads (.querySelector js/document ".aero-sidebar .pad-selection-stack")]
        (.appendChild pads (.shareButton RC #js {:cls "rc-pad action-btn" :label "Share & Chat"}))))))

(when-let [RC (.-RadiiCollab js/window)]
  (start! RC))
