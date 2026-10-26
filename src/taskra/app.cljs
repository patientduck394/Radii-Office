;; Taskra, written in ClojureScript! Scittle (a ClojureScript interpreter in the browser) runs it as is!
;; All the tasks live in one atom as plain Clojure maps, and turn into JSON only at the edges
;; (localStorage, .tk files and live collaboration)!
(ns taskra.app
  (:require [clojure.string :as str]))

(def storage-key "tasks-app-v1")
(def priorities #{"low" "med" "high"})
(def pri-rank {"high" 0 "med" 1 "low" 2})
(def filters #{"all" "active" "done" "overdue"})

(defonce state (atom {:tasks [] :editing nil :filter "all" :search ""}))

;; The ribbon and live collaboration hook in here instead of wrapping functions!
(defonce render-hooks (atom []))
(defonce persist-hooks (atom []))

(defn $ [id] (.getElementById js/document id))

;; ---------- Sounds ----------
(defn click-sound!
  ([] (click-sound! 600 0.08))
  ([frequency duration]
   (try
     (let [ctx (or (.-tasksAudioCtx js/window)
                   (let [C (or (.-AudioContext js/window) (.-webkitAudioContext js/window))]
                     (set! (.-tasksAudioCtx js/window) (C.))))
           osc (.createOscillator ctx)
           gain (.createGain ctx)
           now (.-currentTime ctx)]
       (when (= (.-state ctx) "suspended") (.resume ctx))
       (set! (.-type osc) "sine")
       (set! (.. osc -frequency -value) frequency)
       (.setValueAtTime (.-gain gain) 0.04 now)
       (.exponentialRampToValueAtTime (.-gain gain) 0.001 (+ now duration))
       (.connect osc gain)
       (.connect gain (.-destination ctx))
       (.start osc)
       (.stop osc (+ now duration)))
     (catch :default _ nil))))

;; ---------- Helpers ----------
(defn pad2 [n] (.padStart (str n) 2 "0"))

(defn today-str []
  (let [t (js/Date.)]
    (str (.getFullYear t) "-" (pad2 (inc (.getMonth t))) "-" (pad2 (.getDate t)))))

(defn valid-date? [s]
  (or (nil? s) (= s "") (boolean (re-matches #"\d{4}-\d{2}-\d{2}" (str s)))))

(defn make-id []
  (str "tk_" (.toString (js/Date.now) 36) (.toString (js/Math.floor (* (js/Math.random) 1e6)) 36)))

(defn valid-task? [t]
  (and (map? t)
       (string? (:title t))
       (string? (:id t))
       (contains? priorities (:priority t))
       (boolean? (:done t))
       (valid-date? (or (:due t) ""))
       (string? (or (:notes t) ""))))

(defn esc [s]
  (-> (str (if (nil? s) "" s))
      (str/replace "&" "&amp;")
      (str/replace "<" "&lt;")
      (str/replace ">" "&gt;")
      (str/replace "\"" "&quot;")
      (str/replace "'" "&#39;")))

(defn tasks [] (:tasks @state))
(defn find-task [id] (some #(when (= (:id %) id) %) (tasks)))

(defn overdue? [t]
  (and (not (:done t)) (not= (or (:due t) "") "") (neg? (compare (:due t) (today-str)))))

(defn counts []
  (let [ts (tasks)]
    {:total (count ts)
     :done (count (filter :done ts))
     :overdue (count (filter overdue? ts))}))

(defn visible-tasks []
  (let [{:keys [filter search]} @state
        q (str/lower-case (str/trim search))
        hit? (fn [t] (or (str/includes? (str/lower-case (:title t)) q)
                         (str/includes? (str/lower-case (or (:notes t) "")) q)))
        keep? (case filter
                "active" (complement :done)
                "done" :done
                "overdue" overdue?
                identity)]
    (->> (tasks)
         (clojure.core/filter #(and (hit? %) (keep? %)))
         (sort-by (juxt #(if (:done %) 1 0)
                        #(let [d (:due %)] (if (str/blank? d) "~~~~" d))
                        #(pri-rank (:priority %)))))))

;; ---------- Saving ----------
(defn persist! []
  (try
    (.setItem js/localStorage storage-key (js/JSON.stringify (clj->js {:tasks (tasks)})))
    (catch :default _ nil))
  (doseq [f @persist-hooks] (f)))

(defn parse-tasks [js-list]
  (->> (js->clj js-list :keywordize-keys true)
       (clojure.core/filter valid-task?)
       vec))

(defn restore! []
  (try
    (when-let [raw (.getItem js/localStorage storage-key)]
      (let [doc (js/JSON.parse raw)]
        (when (and doc (js/Array.isArray (.-tasks doc)))
          (swap! state assoc :tasks (parse-tasks (.-tasks doc))))))
    (catch :default _ nil)))

;; ---------- Drawing ----------
(defn task-row [t]
  (str "<div class=\"task-row pri-" (:priority t) (when (:done t) " done") "\">"
       "<input type=\"checkbox\" class=\"task-check\" " (when (:done t) "checked") " onchange=\"toggleTask('" (:id t) "')\" title=\"Toggle done!\">"
       "<div><div class=\"task-title\">" (esc (:title t)) "</div>"
       "<div class=\"task-meta\">" (:priority t) " priority"
       (if (str/blank? (:due t)) " · no due date" (str " · due " (esc (:due t))))
       (when (overdue? t) " · <span class=\"late\">OVERDUE!</span>")
       (when-not (str/blank? (:notes t)) (str " · " (esc (subs (:notes t) 0 (min 60 (count (:notes t)))))))
       "</div></div>"
       "<div class=\"task-actions\">"
       "<button onclick=\"editTask('" (:id t) "')\" title=\"Edit!\">✏️</button>"
       "<button onclick=\"askDeleteTask('" (:id t) "')\" title=\"Delete!\">🗑️</button>"
       "</div></div>"))

(defn render! []
  (let [{:keys [total done overdue]} (counts)
        frame ($ "tasks-list")
        list (visible-tasks)]
    (set! (.-innerText ($ "task-count")) (str total " Tasks · " done " done · " overdue " overdue"))
    (set! (.-innerHTML frame)
          (if (empty? list)
            "<div class=\"empty-note\">Nothing here! Press Add Task to get going!</div>"
            (apply str (map task-row list)))))
  (doseq [f @render-hooks] (f)))

(defn changed! [] (persist!) (render!))

;; ---------- Editing ----------
(defn add-task! [{:keys [title due priority notes]}]
  (let [title (str/trim (str title))
        due (or due "")]
    (when (and (not= title "") (valid-date? due))
      (let [rec {:id (make-id)
                 :title (subs title 0 (min 200 (count title)))
                 :due due
                 :priority (if (contains? priorities priority) priority "med")
                 :notes (let [n (str notes)] (subs n 0 (min 2000 (count n))))
                 :done false
                 :createdAt (.toISOString (js/Date.))}]
        (swap! state update :tasks conj rec)
        (changed!)
        rec))))

(defn update-task! [id {:keys [title due priority notes]}]
  (when-let [rec (find-task id)]
    (let [title (some-> title str str/trim)
          next (cond-> rec
                 (seq title) (assoc :title (subs title 0 (min 200 (count title))))
                 (some? due) (assoc :due due)
                 (some? priority) (assoc :priority priority)
                 (some? notes) (assoc :notes (subs (str notes) 0 (min 2000 (count (str notes))))))]
      (when (and (not= title "") (valid-date? (:due next)) (contains? priorities (:priority next)))
        (swap! state update :tasks (fn [ts] (mapv #(if (= (:id %) id) next %) ts)))
        (changed!)
        true))))

(defn toggle-task! [id]
  (when-let [rec (find-task id)]
    (click-sound! (if (:done rec) 500 750) 0.08)
    (swap! state update :tasks (fn [ts] (mapv #(if (= (:id %) id) (update % :done not) %) ts)))
    (changed!)
    true))

(defn delete-task! [id]
  (swap! state update :tasks (fn [ts] (vec (remove #(= (:id %) id) ts))))
  (changed!))

(defn clear-completed! []
  (swap! state update :tasks (fn [ts] (vec (remove :done ts))))
  (changed!))

(defn set-filter! [mode]
  (click-sound! 550 0.06)
  (swap! state assoc :filter (if (contains? filters mode) mode "all"))
  (render!))

(defn set-search! [q]
  (swap! state assoc :search (str (or q "")))
  (render!))

;; ---------- The task window ----------
(defn open-task-modal!
  ([] (open-task-modal! nil))
  ([task]
   (let [task (when (map? task) task)]
     (swap! state assoc :editing (:id task))
     (set! (.-innerText ($ "task-modal-title-text")) (if task "Edit Task" "Add Task"))
     (set! (.-value ($ "task-title")) (or (:title task) ""))
     (set! (.-value ($ "task-due")) (or (:due task) ""))
     (set! (.-value ($ "task-priority")) (or (:priority task) "med"))
     (set! (.-value ($ "task-notes")) (or (:notes task) ""))
     (set! (.. ($ "task-modal") -style -display) "flex"))))

(defn close-task-modal! []
  (set! (.. ($ "task-modal") -style -display) "none"))

(defn save-task! []
  (let [patch {:title (.-value ($ "task-title"))
               :due (.-value ($ "task-due"))
               :priority (.-value ($ "task-priority"))
               :notes (.-value ($ "task-notes"))}]
    (if (or (str/blank? (:title patch)) (not (valid-date? (:due patch))))
      (js/alert "Give the task a title and a valid due date!")
      (do (click-sound! 700 0.08)
          (if-let [id (:editing @state)]
            (update-task! id patch)
            (add-task! patch))
          (close-task-modal!)
          (render!)))))

(defn edit-task! [id]
  (when-let [rec (find-task id)] (open-task-modal! rec)))

(defn ask-delete-task! [id]
  (click-sound! 400 0.08)
  (delete-task! id))

(defn ask-clear-completed! []
  (click-sound! 350 0.12)
  (when (js/confirm "Delete all completed tasks?")
    (clear-completed!)))

;; ---------- .tk files ----------
(defn tasks-file []
  {:app "Taskra" :version "1.0" :exportedAt (.toISOString (js/Date.)) :tasks (tasks)})

(defn apply-tasks-file! [doc]
  (let [doc (js->clj doc)]
    (if (and (map? doc)
             (contains? #{nil "Taskra" "Tasks"} (get doc "app"))
             (vector? (get doc "tasks")))
      (do (swap! state assoc :tasks (parse-tasks (clj->js (get doc "tasks"))))
          (changed!)
          true)
      false)))

(defn download! [blob filename]
  (let [a (.createElement js/document "a")]
    (set! (.-href a) (js/URL.createObjectURL blob))
    (set! (.-download a) filename)
    (.click a)))

(defn export-tasks! []
  (click-sound! 750 0.12)
  (download! (js/Blob. #js [(js/JSON.stringify (clj->js (tasks-file)) nil 2)] #js {:type "application/json"})
             "tasks.tk"))

(defn import-tasks! [evt]
  (click-sound! 850 0.15)
  (when-let [file (aget (.. evt -target -files) 0)]
    (let [reader (js/FileReader.)]
      (set! (.-onload reader)
            (fn [e]
              (try
                (if (apply-tasks-file! (js/JSON.parse (.. e -target -result)))
                  (js/alert "Tasks file (.tk) loaded successfully!")
                  (js/alert "Invalid .tk file format."))
                (catch :default _ (js/alert "Invalid .tk file format.")))))
      (.readAsText reader file))))

;; ---------- The page's onclick handlers call these by their old names! ----------
(doseq [[k f] {"setFilter" set-filter! "setSearch" set-search! "openTaskModal" open-task-modal!
               "closeTaskModal" close-task-modal! "saveTask" save-task! "editTask" edit-task!
               "askDeleteTask" ask-delete-task! "askClearCompleted" ask-clear-completed!
               "toggleTask" toggle-task! "exportTasks" export-tasks! "importTasks" import-tasks!}]
  (aset js/window k f))

(restore!)
(when ($ "tasks-list") (render!))
