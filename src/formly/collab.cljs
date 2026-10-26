;; Radii Collab adapter for Formly, in ClojureScript! The form's title and description are one
;; unit, every field is its own unit (label, type, options AND the answer, so everyone sees answers
;; appear live), and the field order is merged so two people adding fields at once both keep theirs!
;; Redraws wait while you're typing, so what you type is never replaced under you. Comments ride
;; on fields, and teammates show as dots on the field they're on!
(ns formly.collab
  (:require [clojure.string :as str]
            [formly.app :as app]))

(def backup-key "formly_collab_backup")

(defonce picked (atom nil))
(defonce peers-now (atom []))
(defonce defer-timer (atom nil))

(defn items [x] (seq (js/Array.from x)))
(defn list-el [] (app/$ "form-fields-list"))

;; Puts ids from `list` that `out` is missing back in, right after their old neighbor!
(defn insert-missing [out list exists?]
  (reduce (fn [[out added] [i id]]
            (if (or (some #{id} out) (not (exists? id)))
              [out added]
              (let [at (or (some (fn [k] (let [p (.indexOf (clj->js out) (nth list k))] (when (>= p 0) (inc p))))
                                 (range (dec i) -1 -1))
                           0)]
                [(vec (concat (subvec out 0 at) [id] (subvec out at))) true])))
          [(vec out) false]
          (map-indexed vector (or list []))))

(defn label-of [id]
  (if-let [f (some #(when (= (:id %) id) %) (app/fields))]
    (let [s (str/replace (str (:label f)) #"#[A-Z]+#|~[A-Z-]+~|=[A-Z]+=" "")] (subs s 0 (min 30 (count s))))
    ""))

(defn typing-inside? []
  (let [a (.-activeElement js/document)]
    (boolean (and a (.-closest a) (.closest a "#form-fields-list")
                  (or (#{"INPUT" "TEXTAREA"} (.-tagName a)) (.-isContentEditable a))))))

(defn start! [RC]
  (let [style (.. js/document -documentElement -style)]
    (doseq [[k v] {"--rc-a" "#c4b5fd" "--rc-b" "#8b5cf6" "--rc-rim" "#ddd6fe" "--rc-glow" "rgba(139, 92, 246, 0.45)"}]
      (.setProperty style k v)))
  (letfn [(paint []
            (doseq [[card f] (map vector (items (.-children (list-el))) (app/fields))]
              (let [layer (or (.querySelector card ":scope > .rc-tabdots")
                              (let [l (.createElement js/document "div")]
                                (set! (.-className l) "rc-tabdots")
                                (set! (.. l -style -cssText) "position:absolute;top:-7px;right:14px;display:flex;gap:4px")
                                (.appendChild card l)
                                l))
                    n (count (:comments f))
                    badge (.querySelector card ":scope > .rc-count")]
                (.keyed RC layer (clj->js (for [p @peers-now :when (= (some-> p .-cur .-f) (:id f))]
                                            {:key (.-id p) :tag "i" :cls "" :title (.-name p) :html ""
                                             :style (str "background:" (.-color p) ";width:13px;height:13px;border-radius:50%;display:inline-block;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)")})))
                (cond
                  (and (pos? n) badge) (set! (.-textContent badge) (str "💬 " n))
                  (pos? n) (let [b (.createElement js/document "button")]
                             (set! (.-type b) "button")
                             (set! (.-className b) "rc-count")
                             (set! (.. b -style -cssText) "position:absolute;top:-9px;left:14px;border:0;border-radius:999px;padding:1px 8px;font:700 11px \"JetBrains Mono\",monospace;color:#fff;background:linear-gradient(180deg,#c4b5fd,#8b5cf6);cursor:pointer")
                             (set! (.-textContent b) (str "💬 " n))
                             (.addEventListener b "click" #(.open RC "comments"))
                             (.appendChild card b))
                  badge (.remove badge)))))
          (redraw! []
            (if (typing-inside?)
              ;; redraw once you stop typing (the state is already updated)!
              (do (js/clearTimeout @defer-timer)
                  (reset! defer-timer (js/setTimeout #(if (typing-inside?) (redraw!) (app/render!)) 900)))
              (app/render!)))
          (field-id-at [card]
            (let [i (.indexOf (js/Array.from (.-children (list-el))) card)]
              (when (>= i 0) (:id (nth (app/fields) i nil)))))
          (pick! [e]
            (when-let [c (.closest (.-target e) ".form-field-card")]
              (reset! picked (field-id-at c))
              (.cursorMoved RC)))
          (follow [cur]
            (when (and cur (.-f cur))
              (let [i (first (keep-indexed #(when (= (:id %2) (.-f cur)) %1) (app/fields)))]
                (when-let [c (and i (aget (.-children (list-el)) i))]
                  (.scrollIntoView c #js {:block "center" :behavior "smooth"})))))
          (commit! [] (app/render!))]
    (let [adapter
          #js {:snapshot (fn []
                           (let [f (app/form)]
                             (clj->js (into {"meta" {:title (:title f) :description (:description f)}
                                             "order" (mapv :id (:fields f))}
                                            (for [x (:fields f)] [(str "f:" (:id x)) x])))))
               :apply
               (fn [changed full lost]
                 (let [exists? #(some? (.unit RC (str "f:" %)))
                       lost (if lost (js->clj lost) {})
                       ids (vec (filter exists? (or (js->clj (.unit RC "order")) [])))
                       [ids a] (insert-missing ids (get lost "order") exists?)
                       [ids b] (if full [ids false] (insert-missing ids (mapv :id (app/fields)) exists?))
                       mine (into {} (map (juxt :id identity) (app/fields)))
                       fields (mapv (fn [id]
                                      (let [cur (mine id)]
                                        ;; only fields that changed over there are replaced, the rest stay as you have them
                                        (if (and cur (not full) (not (and changed (.hasOwnProperty changed (str "f:" id)))))
                                          cur
                                          (app/from-js (.unit RC (str "f:" id))))))
                                    ids)
                       meta (app/from-js (.unit RC "meta"))]
                   (swap! app/state update :form
                          (fn [form] (cond-> (assoc form :fields fields)
                                       meta (assoc :title (:title meta) :description (:description meta)))))
                   (app/save!)
                   (redraw!)
                   (if (or a b) #js ["order"] #js [])))
               :mergeable (fn [k] (= k "order"))
               :begin (fn [mode]
                        (when (= mode "guest")
                          (swap! app/state assoc :form {:title "Shared form" :description "" :fields []} :mode "builder")
                          (app/render!))
                        (paint))
               :backup (fn [] (try (.setItem js/localStorage backup-key (js/JSON.stringify (clj->js (app/form)))) true (catch :default _ false)))
               :hasBackup (fn [] (try (boolean (.getItem js/localStorage backup-key)) (catch :default _ false)))
               :restore (fn []
                          (let [d (app/from-js (js/JSON.parse (or (.getItem js/localStorage backup-key) "null")))]
                            (when (vector? (:fields d))
                              (swap! app/state assoc :form d :mode "builder")
                              (app/render!)
                              (try (.removeItem js/localStorage backup-key) (catch :default _ nil)))))
               :cursor (fn [] #js {:f @picked :m (app/mode)})
               :where (fn [cur] (let [n (if (and cur (.-f cur)) (label-of (.-f cur)) "")]
                                  (if (seq n) (str "On \"" n "\"") "Looking around")))
               :drawCursors (fn [peers] (reset! peers-now (vec (items peers))) (paint))
               :follow follow
               :comments
               #js {:hint "Comment on the field you are on"
                    :list (fn [] (clj->js (for [f (app/fields) c (:comments f)]
                                            {:id (str (:id f) "|" (:id c)) :where (str "Field · " (label-of (:id f))) :items (:items c)})))
                    :add (fn [text me]
                           (if-not (some #(= (:id %) @picked) (app/fields))
                             (do (.toast RC "Click a field first, then write your comment!") false)
                             (do (app/update-field! @picked #(update % :comments (fnil conj [])
                                                                     {:id (str "c" (.uid RC 8))
                                                                      :items [{:by (.-id me) :name (.-name me) :text text :at (js/Date.now)}]}))
                                 (commit!)
                                 true)))
                    :reply (fn [id text me]
                             (let [[fid cid] (str/split id #"\|")]
                               (app/update-field! fid (fn [f] (update f :comments
                                                                      (fn [cs] (mapv #(if (= (:id %) cid)
                                                                                        (update % :items conj {:by (.-id me) :name (.-name me) :text text :at (js/Date.now)})
                                                                                        %) cs)))))
                               (commit!)))
                    :resolve (fn [id]
                               (let [[fid cid] (str/split id #"\|")]
                                 (app/update-field! fid (fn [f] (let [cs (vec (remove #(= (:id %) cid) (:comments f)))]
                                                                  (if (seq cs) (assoc f :comments cs) (dissoc f :comments)))))
                                 (commit!)))
                    :jump (fn [id]
                            (reset! picked (first (str/split id #"\|")))
                            (follow #js {:f @picked}))}}]
      (.addEventListener (list-el) "focusin" pick!)
      (.addEventListener (list-el) "click" pick!)
      (.init RC #js {:app "formly" :appName "Formly" :docName "form" :adapter adapter})
      (swap! app/change-hooks conj #(do (.changed RC) (.cursorMoved RC)))
      (swap! app/render-hooks conj paint)
      (when-let [tr (.querySelector js/document "#os-title .os-tr")]
        (.insertBefore tr (.shareButton RC) (.-firstChild tr)))
      (when-let [pads (.querySelector js/document ".aero-sidebar .pad-selection-stack")]
        (.appendChild pads (.shareButton RC #js {:cls "rc-pad pad-toggle-btn" :label "Share & Chat"}))))))

(when-let [RC (.-RadiiCollab js/window)]
  (start! RC))
