;; Radii Collab adapter for Hexa, in ClojureScript! The calendar's events and the Boards
;; (columns + cards) all sync live: every event and every card is its own unit, and the card
;; order inside each column is merged so two people adding cards at once both keep theirs!
;; Comments ride on events and cards, and teammates show as colored dots beside the month title!
(ns hexa.collab
  (:require [clojure.string :as str]
            [hexa.app :as app]))

(def backup-key "hexa_collab_backup")

(defonce picked (atom nil)) ; {:kind "e"|"k" :id ...}
(defonce peers-now (atom []))
(defonce layer (atom nil))

(defn items [x] (seq (js/Array.from x)))

;; ---------- Snapshot: events, boards, columns, cards ----------
(defn snapshot []
  (let [out (transient {"bo" (mapv :id (app/boards))})]
    (doseq [e (app/events)] (assoc! out (str "e:" (:id e)) e))
    (persistent!
     (reduce (fn [out b]
               (reduce (fn [out c]
                         (reduce (fn [out k] (assoc! out (str "k:" (:id k)) (merge {:b (:id b) :c (:id c)} k)))
                                 (-> out
                                     (assoc! (str "cm:" (:id b) ":" (:id c)) {:name (:name c)})
                                     (assoc! (str "ko:" (:id b) ":" (:id c)) (mapv :id (:cards c))))
                                 (:cards c)))
                       (-> out
                           (assoc! (str "bm:" (:id b)) {:name (:name b)})
                           (assoc! (str "bc:" (:id b)) (mapv :id (:columns b))))
                       (:columns b)))
             out (app/boards)))))

;; Puts ids from `list` that `out` is missing back in, right after their old neighbor!
(defn insert-missing [out list exists?]
  (reduce (fn [[out added] [i id]]
            (if (or (some #{id} out) (not (exists? id)))
              [out added]
              (let [prev (some (fn [k] (let [p (.indexOf (clj->js out) (nth list k))] (when (>= p 0) (inc p))))
                               (range (dec i) -1 -1))
                    at (or prev 0)]
                [(vec (concat (subvec out 0 at) [id] (subvec out at))) true])))
          [(vec out) false]
          (map-indexed vector (or list []))))

(defn unit [RC k] (some-> (.unit RC k) (js->clj :keywordize-keys true)))

(defn start! [RC]
  (let [style (.. js/document -documentElement -style)]
    (doseq [[k v] {"--rc-a" "#5eead4" "--rc-b" "#14b8a6" "--rc-rim" "#99f6e4" "--rc-glow" "rgba(20, 184, 166, 0.45)"}]
      (.setProperty style k v)))
  (letfn [(where [cur]
            (cond
              (nil? cur) "Looking around"
              (= (.-v cur) "boards") (str "On board " (if-let [b (some #(when (= (:id %) (.-b cur)) %) (app/boards))] (str "\"" (:name b) "\"") ""))
              :else (str "Viewing " (if (some? (.-m cur)) (str (nth app/months (.-m cur)) " " (.-y cur)) "the calendar"))))
          (paint []
            (when-let [host (or (.querySelector js/document ".calendar-toolbar .toolbar-hint") (.querySelector js/document ".calendar-toolbar"))]
              (when-not (and @layer (.-isConnected @layer))
                (let [l (.createElement js/document "div")]
                  (set! (.-className l) "rc-tabdots")
                  (set! (.. l -style -cssText) "display:flex;gap:5px;align-items:center;margin-left:10px")
                  (.after host l)
                  (reset! layer l)))
              (.keyed RC @layer (clj->js (for [p @peers-now]
                                           {:key (.-id p) :tag "i" :cls "" :html "" :title (str (.-name p) " · " (where (.-cur p)))
                                            :style (str "background:" (.-color p) ";width:13px;height:13px;border-radius:50%;display:inline-block;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)")})))
              (doseq [e (items (.querySelectorAll js/document "[data-rc-id]"))] (.removeAttribute e "data-rc-id"))))
          (redraw! [] (app/render!) (when (= (:view @app/state) "boards") (app/render-boards!)))
          (find-thing [kind id]
            (if (= kind "e")
              (some #(when (= (:id %) id) %) (app/events))
              (first (for [b (app/boards) c (:columns b) k (:cards c) :when (= (:id k) id)] k))))
          (update-thing! [kind id f]
            (if (= kind "e")
              (swap! app/state update :events (fn [es] (mapv #(if (= (:id %) id) (f %) %) es)))
              (swap! app/state update :boards
                     (fn [bs] (mapv (fn [b] (update b :columns (fn [cs] (mapv (fn [c] (update c :cards (fn [ks] (mapv #(if (= (:id %) id) (f %) %) ks)))) cs)))) bs)))))
          (commit! [] (app/persist!) (redraw!))]
    (let [adapter
          #js {:snapshot (fn [] (clj->js (snapshot)))
               :apply
               (fn [_changed full lost]
                 (let [lost (if lost (js->clj lost) {})
                       local (if full {} (js->clj (clj->js (snapshot))))
                       again (atom [])
                       order (fn [key exists?]
                               (let [ids (vec (filter exists? (or (js->clj (.unit RC key)) [])))
                                     [ids a] (insert-missing ids (get lost key) exists?)
                                     [ids b] (if full [ids false] (insert-missing ids (get local key) exists?))]
                                 (when (or a b) (swap! again conj key))
                                 ids))
                       ;; Cards by column, so strays (a card whose column order isn't here yet) still land!
                       cards-by (reduce (fn [m k] (if-let [u (.unit RC k)] (update m (str (.-b u) ":" (.-c u)) (fnil conj []) (subs k 2)) m))
                                        {} (items (.unitKeys RC "k:")))
                       b-exists? #(some? (.unit RC (str "bm:" %)))
                       next-boards
                       (->> (order "bo" b-exists?)
                            (map (fn [bid]
                                   (let [c-exists? #(some? (.unit RC (str "cm:" bid ":" %)))
                                         cols (mapv (fn [cid]
                                                      (let [has (get cards-by (str bid ":" cid) [])
                                                            ids (order (str "ko:" bid ":" cid) #(some #{%} has))
                                                            ids (into ids (remove (set ids) has))]
                                                        {:id cid :name (or (:name (unit RC (str "cm:" bid ":" cid))) "Column")
                                                         :cards (mapv #(dissoc (unit RC (str "k:" %)) :b :c) ids)}))
                                                    (order (str "bc:" bid) c-exists?))]
                                     {:id bid :name (or (:name (unit RC (str "bm:" bid))) "Board") :columns cols})))
                            (filter #(seq (:columns %)))
                            vec)
                       evs (->> (items (.unitKeys RC "e:"))
                                (map #(unit RC %))
                                (filter #(and % (string? (:title %)) (app/parse-date (:date %))))
                                vec)]
                   (swap! app/state assoc :events evs :boards next-boards)
                   (app/ensure-boards!)
                   ;; save quietly: this change came FROM the session, so no RC.changed() echo
                   (try (.setItem js/localStorage app/storage-key (js/JSON.stringify (app/save-json))) (catch :default _ nil))
                   (redraw!)
                   (paint)
                   (clj->js @again)))
               :mergeable (fn [k] (or (= k "bo") (str/starts-with? k "bc:") (str/starts-with? k "ko:")))
               :begin (fn [mode]
                        (when (= mode "guest")
                          (swap! app/state assoc :events [] :boards [])
                          (app/ensure-boards!)
                          (redraw!))
                        (paint))
               :backup (fn [] (try (.setItem js/localStorage backup-key (js/JSON.stringify (clj->js {:events (app/events) :boards (app/boards)}))) true
                                   (catch :default _ false)))
               :hasBackup (fn [] (try (boolean (.getItem js/localStorage backup-key)) (catch :default _ false)))
               :restore (fn []
                          (when-let [d (app/from-js (js/JSON.parse (or (.getItem js/localStorage backup-key) "null")))]
                            (swap! app/state assoc
                                   :events (if (vector? (:events d)) (:events d) [])
                                   :boards (if (vector? (:boards d)) (:boards d) []))
                            (app/ensure-boards!)
                            (app/persist!)
                            (redraw!)
                            (try (.removeItem js/localStorage backup-key) (catch :default _ nil))))
               :cursor (fn [] (let [{:keys [view selected year month active-board]} @app/state]
                                #js {:v view :d selected :y year :m month :b active-board}))
               :where where
               :drawCursors (fn [peers] (reset! peers-now (vec (items peers))) (paint))
               :follow (fn [cur]
                         (when cur
                           (when (and (.-v cur) (not= (.-v cur) (:view @app/state))) (app/set-view-mode! (.-v cur)))
                           (when (and (some? (.-y cur)) (some? (.-m cur)))
                             (swap! app/state assoc :year (.-y cur) :month (.-m cur))
                             (app/render!))))
               :comments
               #js {:hint "Comment on the event or card you opened"
                    :list (fn []
                            (clj->js (concat
                                      (for [x (app/events) c (:comments x)] {:id (str "e|" (:id x) "|" (:id c)) :where (str "Event · " (:title x)) :items (:items c)})
                                      (for [b (app/boards) col (:columns b) k (:cards col) c (:comments k)]
                                        {:id (str "k|" (:id k) "|" (:id c)) :where (str "Card · " (:title k)) :items (:items c)}))))
                    :add (fn [text me]
                           (let [{:keys [kind id]} @picked]
                             (if-not (and kind (find-thing kind id))
                               (do (.toast RC "Open an event or a card first (click it), then comment!") false)
                               (do (update-thing! kind id #(update % :comments (fnil conj [])
                                                                   {:id (str "c" (.uid RC 8))
                                                                    :items [{:by (.-id me) :name (.-name me) :text text :at (js/Date.now)}]}))
                                   (commit!)
                                   true))))
                    :reply (fn [id text me]
                             (let [[kind tid cid] (str/split id #"\|")]
                               (update-thing! kind tid (fn [t] (update t :comments
                                                                       (fn [cs] (mapv #(if (= (:id %) cid)
                                                                                         (update % :items conj {:by (.-id me) :name (.-name me) :text text :at (js/Date.now)})
                                                                                         %) cs)))))
                               (commit!)))
                    :resolve (fn [id]
                               (let [[kind tid cid] (str/split id #"\|")]
                                 (update-thing! kind tid (fn [t] (let [cs (vec (remove #(= (:id %) cid) (:comments t)))]
                                                                   (if (seq cs) (assoc t :comments cs) (dissoc t :comments)))))
                                 (commit!)))
                    :jump (fn [id]
                            (let [[kind tid] (str/split id #"\|")
                                  t (find-thing kind tid)]
                              (when t
                                (if (and (= kind "e") (:date t))
                                  (do (swap! app/state assoc :selected (:date t))
                                      (when-let [{:keys [y m]} (app/parse-date (:date t))] (swap! app/state assoc :year y :month m))
                                      (when (not= (:view @app/state) "calendar") (app/set-view-mode! "calendar"))
                                      (app/render!))
                                  (when (and (= kind "k") (not= (:view @app/state) "boards")) (app/set-view-mode! "boards"))))))}}]
      ;; Comments go on the event or card you last opened!
      (.addEventListener js/document "click"
                         (fn [e]
                           (when-let [el (and (.-closest (.-target e)) (.closest (.-target e) "[onclick]"))]
                             (let [code (or (.getAttribute el "onclick") "")]
                               (if-let [[_ id] (re-find #"editEvent\('([^']+)'\)" code)]
                                 (do (reset! picked {:kind "e" :id id}) (.cursorMoved RC))
                                 (when-let [[_ id] (re-find #"editCard\('[^']*',\s*'[^']*',\s*'([^']+)'\)" code)]
                                   (reset! picked {:kind "k" :id id})))))))
      (.addEventListener js/document "click"
                         (fn [e]
                           (when-let [card (and (.-closest (.-target e)) (.closest (.-target e) ".kanban-card"))]
                             (let [t (some-> (.querySelector card "div") .-textContent)]
                               (doseq [b (app/boards) c (:columns b) k (:cards c) :when (= (:title k) t)]
                                 (reset! picked {:kind "k" :id (:id k)})))))
                         true)
      (.init RC #js {:app "hexa" :appName "Hexa" :docName "calendar" :adapter adapter})
      (swap! app/persist-hooks conj #(.changed RC))
      (swap! app/render-hooks conj #(.cursorMoved RC))
      (swap! app/view-hooks conj #(.cursorMoved RC))
      (when-let [tr (.querySelector js/document "#os-title .os-tr")]
        (.insertBefore tr (.shareButton RC) (.-firstChild tr)))
      (when-let [pads (.querySelector js/document ".aero-sidebar .pad-selection-stack")]
        (.appendChild pads (.shareButton RC #js {:cls "rc-pad action-btn" :label "Share & Chat"}))))))

(when-let [RC (.-RadiiCollab js/window)]
  (start! RC))
