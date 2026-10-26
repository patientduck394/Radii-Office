;; Hexa, written in ClojureScript! A month calendar with an agenda, plus Kanban boards whose
;; due cards show up on the calendar. Scittle runs this file in the browser as it is!
;; Everything lives in one atom as plain Clojure maps, and becomes JSON only at the edges
;; (localStorage, .kh / .ics files and live collaboration)!
(ns hexa.app
  (:require [clojure.string :as str]))

(def storage-key "hexa-calendar-v1")
(def months ["January" "February" "March" "April" "May" "June" "July" "August" "September" "October" "November" "December"])

;; Gel Bubble Remix Pack: thirty rainbow shades, one per id, stable forever!
(def shades ["red" "coral" "orange" "amber" "gold" "yellow" "cream" "lime" "olive" "green" "emerald" "mint" "teal" "turquoise"
             "cyan" "sky" "blue" "navy" "indigo" "violet" "purple" "lavender" "fuchsia" "pink" "rose" "brown" "white" "fog" "slate" "black"])
(def shade? (set shades))

(defonce state
  (atom {:events [] :boards [] :active-board nil :view "calendar"
         :year 2026 :month 0 :selected nil
         :editing-event nil :editing-card nil
         :pending-color "" :pending-card-color "" :color-target "event" :popup-built false}))

;; The ribbon and live collaboration hook in here instead of wrapping functions!
(defonce render-hooks (atom []))
(defonce boards-hooks (atom []))
(defonce persist-hooks (atom []))
(defonce view-hooks (atom []))

(defn $ [id] (.getElementById js/document id))

(defn click-sound!
  ([] (click-sound! 600 0.08))
  ([frequency duration]
   (try
     (let [ctx (or (.-hexaAudioCtx js/window)
                   (let [C (or (.-AudioContext js/window) (.-webkitAudioContext js/window))]
                     (set! (.-hexaAudioCtx js/window) (C.))))
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

;; ---------- Dates ----------
(defn pad2 [n] (.padStart (str n) 2 "0"))
(defn date-str [y m d] (str y "-" (pad2 (inc m)) "-" (pad2 d)))
(defn js-date-str [d] (date-str (.getFullYear d) (.getMonth d) (.getDate d)))
(defn today-str [] (js-date-str (js/Date.)))

(defn parse-date [s]
  (when-let [[_ y m d] (re-matches #"(\d{4})-(\d{2})-(\d{2})" (str s))]
    {:y (js/parseInt y 10) :m (dec (js/parseInt m 10)) :d (js/parseInt d 10)}))

(defn days-in-month [y m] (.getDate (js/Date. y (inc m) 0)))

;; Sunday-start month grid: 6 rows x 7 days, dimmed outer days included!
(defn month-grid [y m]
  (let [first-dow (.getDay (js/Date. y m 1))
        prev-days (days-in-month y (dec m))
        before (for [i (range (dec first-dow) -1 -1)]
                 {:date (js-date-str (js/Date. y (dec m) (- prev-days i))) :in-month false})
        during (for [d (range 1 (inc (days-in-month y m)))] {:date (date-str y m d) :in-month true})
        cells (vec (concat before during))
        total (max 42 (* 7 (js/Math.ceil (/ (count cells) 7))))
        after (for [n (range 1 (inc (- total (count cells))))]
                {:date (js-date-str (js/Date. y (inc m) n)) :in-month false})]
    (partition 7 (concat cells after))))

(defn make-id []
  (str "hx_" (.toString (js/Date.now) 36) (.toString (js/Math.floor (* (js/Math.random) 1e6)) 36)))

(defn esc [s]
  (-> (str (if (nil? s) "" s))
      (str/replace "&" "&amp;") (str/replace "<" "&lt;") (str/replace ">" "&gt;")
      (str/replace "\"" "&quot;") (str/replace "'" "&#39;")))

;; The same stable shade the JavaScript version picked, so colors never change!
(defn bubble-class [id]
  (let [h (reduce (fn [h ch] (mod (+ (* h 31) (.charCodeAt ch 0)) 4294967296)) 0 (str id))]
    (str "mkt-bubble-" (nth shades (mod h (count shades))))))
(defn event-bubble [ev] (if (shade? (:color ev)) (str "mkt-bubble-" (:color ev)) (bubble-class (:id ev))))
(def card-bubble event-bubble)

;; ---------- Reading the state ----------
(defn events [] (:events @state))
(defn boards [] (:boards @state))

(defn events-on [date]
  (->> (events) (filter #(= (:date %) date)) (sort-by #(or (not-empty (:time %)) "99"))))

(defn cards-due-on [date]
  (for [b (boards) col (:columns b) card (:cards col) :when (= (:due card) date)]
    {:board b :col col :card card}))

(defn find-card [board-id card-id]
  (first (for [b (boards) :when (= (:id b) board-id) col (:columns b) card (:cards col) :when (= (:id card) card-id)]
           {:board b :col col :card card})))

(defn overdue? [d] (neg? (compare d (today-str))))

(defn valid-card? [c]
  (and (map? c) (string? (:title c)) (string? (or (:due c) ""))
       (or (nil? (:due c)) (= (:due c) "") (parse-date (:due c)))))

(defn valid-board? [b]
  (and (map? b) (string? (:name b)) (string? (:id b))
       (vector? (:columns b)) (seq (:columns b))
       (every? (fn [col] (and (map? col) (string? (:name col)) (vector? (:cards col))
                              (every? #(and (valid-card? %) (string? (:id %))) (:cards col))))
               (:columns b))))

(defn fix-color [x] (if (shade? (:color x)) x (assoc x :color "")))

(defn clean-events [list]
  (->> list (filter #(and (map? %) (string? (:title %)) (parse-date (:date %)))) (mapv fix-color)))

(defn clean-boards [list]
  (->> list (filter valid-board?)
       (mapv (fn [b] (update b :columns (fn [cols] (mapv (fn [c] (update c :cards #(mapv fix-color %))) cols)))))))

(defn fresh-board [name]
  {:id (make-id) :name name
   :columns [{:id (make-id) :name "To Do" :cards []} {:id (make-id) :name "Doing" :cards []} {:id (make-id) :name "Done" :cards []}]})

(defn ensure-boards! []
  (swap! state (fn [s]
                 (let [bs (clean-boards (or (:boards s) []))
                       s (if (seq bs) (assoc s :boards bs)
                             (let [b (fresh-board "Tasks")] (assoc s :boards [b] :active-board (:id b))))]
                   (if (some #(= (:id %) (:active-board s)) (:boards s)) s
                       (assoc s :active-board (:id (first (:boards s)))))))))

(defn active-board []
  (ensure-boards!)
  (let [{:keys [boards active-board]} @state]
    (or (some #(when (= (:id %) active-board) %) boards) (first boards))))

;; ---------- Saving ----------
(defn save-json [] (clj->js {:events (events) :boards (boards) :activeBoardId (:active-board @state)}))

(defn persist! []
  (try (.setItem js/localStorage storage-key (js/JSON.stringify (save-json))) (catch :default _ nil))
  (doseq [f @persist-hooks] (f)))

(defn from-js [o] (js->clj o :keywordize-keys true))

(defn restore! []
  (try
    (when-let [raw (.getItem js/localStorage storage-key)]
      (let [doc (from-js (js/JSON.parse raw))]
        (when (vector? (:events doc)) (swap! state assoc :events (clean-events (:events doc))))
        (when (vector? (:boards doc))
          (swap! state assoc :boards (clean-boards (:boards doc)))
          (when (string? (:activeBoardId doc)) (swap! state assoc :active-board (:activeBoardId doc))))))
    (catch :default _ nil)))

;; ---------- Drawing the calendar ----------
(defn day-cell [{:keys [date in-month]} {:keys [selected]}]
  (let [evs (events-on date)
        due (cards-due-on date)
        shown (take 3 evs)
        total (+ (count evs) (count due))
        cls (cond-> ["day-cell"] (not in-month) (conj "dim") (= date (today-str)) (conj "today") (= date selected) (conj "selected"))]
    (str "<div class=\"" (str/join " " cls) "\" onclick=\"pickDay('" date "')\">"
         "<div class=\"day-number\">" (js/parseInt (subs date 8 10) 10) "</div>"
         (apply str (for [ev shown]
                      (str "<div class=\"event-chip " (event-bubble ev) "\">" (esc (if (seq (:time ev)) (str (:time ev) " ") "")) (esc (or (not-empty (:title ev)) "Untitled")) "</div>")))
         (apply str (for [{:keys [card]} (take (max 0 (- 3 (count shown))) due)]
                      (str "<div class=\"event-chip " (card-bubble card) "\">📌 " (esc (:title card)) "</div>")))
         (when (> total 3) (str "<div class=\"more-chip\">+" (- total 3) " more</div>"))
         "</div>")))

(defn render! []
  (let [{:keys [year month selected] :as s} @state]
    (set! (.-innerText ($ "month-title-text")) (str (nth months month) " " year))
    (set! (.-innerText ($ "event-count")) (str (count (events)) " Events"))
    (set! (.-innerHTML ($ "hexa-grid")) (apply str (for [week (month-grid year month) cell week] (day-cell cell s))))
    (let [evs (events-on selected)
          due (cards-due-on selected)
          agenda ($ "agenda-list")]
      (set! (.-innerText ($ "agenda-date")) (str "Agenda — " selected))
      (set! (.-innerHTML agenda)
            (if (and (empty? evs) (empty? due))
              "<div style=\"color:#99f6e4;\">No events! Press Add Event to create one!</div>"
              (str (apply str (for [ev evs]
                                (str "<div class=\"agenda-item\"><span>" (esc (or (not-empty (:time ev)) "all-day")) " — " (esc (or (not-empty (:title ev)) "Untitled")) "</span>"
                                     "<button onclick=\"editEvent('" (:id ev) "')\" title=\"Edit!\">✏️</button>"
                                     "<button onclick=\"askDeleteEvent('" (:id ev) "')\" title=\"Delete!\">🗑️</button></div>")))
                   (apply str (for [{:keys [board col card]} due]
                                (str "<div class=\"agenda-item\"><span>📌 " (esc (:title card)) " <small>(" (esc (:name board)) " / " (esc (:name col)) ")</small></span>"
                                     "<button onclick=\"editCard('" (:id board) "', '" (:id col) "', '" (:id card) "')\" title=\"Edit!\">✏️</button></div>"))))))))
  (doseq [f @render-hooks] (f)))

;; ---------- Events ----------
(defn add-event! [ev]
  (let [rec (merge {:id (make-id) :title "" :date (today-str) :time "" :desc ""} ev)]
    (when (parse-date (:date rec))
      (swap! state update :events conj rec)
      (persist!) (render!)
      rec)))

(defn update-event! [id patch]
  (let [next (some-> (some #(when (= (:id %) id) %) (events)) (merge patch))]
    (when (and next (parse-date (:date next)))
      (swap! state update :events (fn [es] (mapv #(if (= (:id %) id) next %) es)))
      (persist!) (render!)
      true)))

(defn delete-event! [id]
  (swap! state update :events (fn [es] (vec (remove #(= (:id %) id) es))))
  (persist!) (render!))

(defn clear-calendar! []
  (swap! state assoc :events [])
  (persist!) (render!))

;; ---------- The shared color popup (events and cards) ----------
(defn paint-color-button! []
  (let [{:keys [color-target pending-color pending-card-color]} @state
        card? (= color-target "card")
        btn ($ (if card? "card-color-btn" "event-color-btn"))
        v (if card? pending-card-color pending-color)]
    (when btn
      (set! (.-className btn) (str "event-chip " (if (shade? v) (str "mkt-bubble-" v) "mkt-bubble-slate")))
      (set! (.-textContent btn) (if (shade? v) v "auto")))))

(declare pick-event-color!)

(defn wire-color-popup! []
  (let [popup ($ "event-color-popup")]
    (when (and popup (not (:popup-built @state)))
      (swap! state assoc :popup-built true)
      (doseq [shade shades]
        (let [sw (.createElement js/document "button")]
          (set! (.-type sw) "button")
          (set! (.-className sw) (str "event-chip mkt-bubble-" shade))
          (set! (.-textContent sw) (str/upper-case (subs shade 0 1)))
          (set! (.-title sw) shade)
          (set! (.-onclick sw) #(pick-event-color! shade))
          (.appendChild popup sw)))
      ;; BOTH pickers share this one popup: a click on EITHER button keeps it open!
      (.addEventListener js/document "click"
                         (fn [e]
                           (let [pop ($ "event-color-popup")
                                 inside? (fn [id] (some-> ($ id) (.contains (.-target e))))]
                             (when (and pop (not= (.. pop -style -display) "none")
                                        (not (.contains pop (.-target e)))
                                        (not (inside? "event-color-btn")) (not (inside? "card-color-btn")))
                               (set! (.. pop -style -display) "none"))))))))

(defn toggle-color-popup! [which]
  (click-sound! 500 0.05)
  (swap! state assoc :color-target (if (= which "card") "card" "event"))
  (wire-color-popup!)
  (when-let [popup ($ "event-color-popup")]
    (let [d (.. popup -style -display)]
      (set! (.. popup -style -display) (if (or (= d "none") (= d "")) "flex" "none")))))

(defn pick-event-color! [shade]
  (click-sound! 600 0.06)
  (let [v (if (shade? shade) shade "")]
    (swap! state assoc (if (= (:color-target @state) "card") :pending-card-color :pending-color) v))
  (paint-color-button!)
  (set! (.. ($ "event-color-popup") -style -display) "none"))

;; ---------- .ics ----------
(defn escape-ics [s]
  (-> (str (if (nil? s) "" s)) (str/replace "\\" "\\\\") (str/replace ";" "\\;") (str/replace "," "\\,") (str/replace "\n" "\\n")))

(defn unescape-ics [s]
  (-> (str s) (str/replace "\\n" "\n") (str/replace "\\," ",") (str/replace "\\;" ";") (str/replace "\\\\" "\\")))

(defn ics-stamp [d]
  (str (.getUTCFullYear d) (pad2 (inc (.getUTCMonth d))) (pad2 (.getUTCDate d)) "T"
       (pad2 (.getUTCHours d)) (pad2 (.getUTCMinutes d)) (pad2 (.getUTCSeconds d)) "Z"))

(defn event->ics [ev]
  (let [flat (str/replace (:date ev) "-" "")]
    (concat ["BEGIN:VEVENT" (str "UID:" (:id ev) "@hexa") (str "DTSTAMP:" (ics-stamp (js/Date.)))
             (if (re-matches #"\d{2}:\d{2}" (str (:time ev)))
               (str "DTSTART:" flat "T" (str/replace (:time ev) ":" "") "00")
               (str "DTSTART;VALUE=DATE:" flat))
             (str "SUMMARY:" (escape-ics (:title ev)))]
            (when (seq (:desc ev)) [(str "DESCRIPTION:" (escape-ics (:desc ev)))])
            (when (shade? (:color ev)) [(str "X-HEXA-COLOR:" (:color ev))])
            ["END:VEVENT"])))

(defn ics-content [list]
  (str/join "\r\n" (concat ["BEGIN:VCALENDAR" "VERSION:2.0" "PRODID:-//Radii Office//Hexa//EN"] (mapcat event->ics list) ["END:VCALENDAR"])))

;; Basic VEVENT import: UID/SUMMARY/DESCRIPTION/DTSTART (DATE or floating DATETIME)!
(defn parse-ics [text]
  (let [unfolded (-> (str text) (str/replace #"\r\n[ \t]" "") (str/replace #"\n[ \t]" ""))]
    (loop [lines (map str/trim (str/split unfolded #"\r?\n"))
           cur nil
           seen (set (map :id (events)))
           out []]
      (if-let [[line & more] (seq lines)]
        (cond
          (= line "BEGIN:VEVENT") (recur more {:id "" :title "" :date "" :time "" :desc ""} seen out)
          (= line "END:VEVENT")
          (if (and cur (parse-date (:date cur)) (not (and (seq (:id cur)) (seen (:id cur)))))
            ;; a UID we already have is skipped, so re-imports stay idempotent!
            (let [cur (if (seq (:id cur)) cur (assoc cur :id (make-id)))]
              (recur more nil (conj seen (:id cur)) (conj out cur)))
            (recur more nil seen out))
          cur
          (let [cur (if-let [[_ v] (re-matches #"UID:(.*)" line)] (assoc cur :id (str/replace v #"@hexa$" ""))
                        (if-let [[_ v] (re-matches #"X-HEXA-COLOR:(.*)" line)] (if (shade? v) (assoc cur :color v) cur)
                            (if-let [[_ v] (re-matches #"SUMMARY:(.*)" line)] (assoc cur :title (unescape-ics v))
                                (if-let [[_ v] (re-matches #"DESCRIPTION:(.*)" line)] (assoc cur :desc (unescape-ics v))
                                    (if-let [[_ d hm] (re-matches #"DTSTART(?:;[^:]*)?:(\d{8})(?:T(\d{4})(\d{2})?)?" line)]
                                      (cond-> (assoc cur :date (str (subs d 0 4) "-" (subs d 4 6) "-" (subs d 6 8)))
                                        hm (assoc :time (str (subs hm 0 2) ":" (subs hm 2 4))))
                                      cur)))))]
            (recur more cur seen out))
          :else (recur more cur seen out))
        out))))

;; ---------- Moving around the calendar ----------
(defn shift-month! [dir]
  (click-sound! 600 0.06)
  (swap! state (fn [{:keys [year month] :as s}]
                 (let [m (+ month dir)]
                   (cond (neg? m) (assoc s :month 11 :year (dec year))
                         (> m 11) (assoc s :month 0 :year (inc year))
                         :else (assoc s :month m)))))
  (render!))

(defn go-today! []
  (click-sound! 650 0.08)
  (let [t (js/Date.)]
    (swap! state assoc :year (.getFullYear t) :month (.getMonth t) :selected (today-str)))
  (render!))

(defn pick-day! [date]
  (click-sound! 550 0.06)
  (swap! state assoc :selected date)
  (when-let [{:keys [y m]} (parse-date date)] (swap! state assoc :year y :month m))
  (render!))

;; ---------- The event window ----------
(defn open-event-modal!
  ([] (open-event-modal! nil))
  ([ev]
   (let [ev (when (map? ev) ev)]
     (swap! state assoc :editing-event (:id ev) :pending-color (if (shade? (:color ev)) (:color ev) "") :color-target "event")
     (set! (.-innerText ($ "modal-title-text")) (if ev "Edit Event" "Add Event"))
     (set! (.-value ($ "event-title")) (or (:title ev) ""))
     (set! (.-value ($ "event-date")) (or (:date ev) (:selected @state)))
     (set! (.-value ($ "event-time")) (or (:time ev) ""))
     (set! (.-value ($ "event-desc")) (or (:desc ev) ""))
     (paint-color-button!)
     (when-let [popup ($ "event-color-popup")] (set! (.. popup -style -display) "none"))
     (set! (.. ($ "event-modal") -style -display) "flex"))))

(defn close-event-modal! [] (set! (.. ($ "event-modal") -style -display) "none"))

(defn save-event! []
  (let [patch {:title (.-value ($ "event-title")) :date (.-value ($ "event-date"))
               :time (.-value ($ "event-time")) :desc (.-value ($ "event-desc"))
               :color (let [c (:pending-color @state)] (if (shade? c) c ""))}]
    (if (or (str/blank? (:title patch)) (not (parse-date (:date patch))))
      (js/alert "Give the event a title and a valid date!")
      (do (click-sound! 700 0.08)
          (if-let [id (:editing-event @state)] (update-event! id patch) (add-event! patch))
          (swap! state assoc :selected (:date patch))
          (close-event-modal!)
          (render!)))))

(defn edit-event! [id] (when-let [rec (some #(when (= (:id %) id) %) (events))] (open-event-modal! rec)))
(defn ask-delete-event! [id] (click-sound! 400 0.08) (delete-event! id))
(defn ask-clear-calendar! []
  (click-sound! 350 0.12)
  (when (js/confirm "Delete ALL events?") (clear-calendar!)))

;; ---------- Boards ----------
(declare render-boards! open-card-modal!)

(defn set-view-mode! [mode]
  (click-sound! 550 0.08)
  (let [v (if (= mode "boards") "boards" "calendar")]
    (swap! state assoc :view v)
    (set! (.. ($ "calendar-view") -style -display) (if (= v "calendar") "flex" "none"))
    (set! (.. ($ "boards-view") -style -display) (if (= v "boards") "flex" "none"))
    (.toggle (.-classList ($ "view-calendar-btn")) "active" (= v "calendar"))
    (.toggle (.-classList ($ "view-boards-btn")) "active" (= v "boards"))
    (if (= v "boards") (render-boards!) (render!)))
  (doseq [f @view-hooks] (f)))

(defn redraw! [] (if (= (:view @state) "boards") (render-boards!) (render!)))

(defn update-board [board-id f]
  (swap! state update :boards (fn [bs] (mapv #(if (= (:id %) board-id) (f %) %) bs))))

(defn update-cards [board-id f]
  ;; f gets each column and returns it changed
  (update-board board-id (fn [b] (update b :columns #(mapv f %)))))

(defn add-board! [name]
  (let [clean (str/trim (str name))]
    (when (seq clean)
      (click-sound! 700 0.08)
      (let [b (fresh-board (subs clean 0 (min 60 (count clean))))]
        (swap! state #(-> % (update :boards conj b) (assoc :active-board (:id b))))
        (persist!) (render-boards!)
        b))))

(defn delete-board! [id]
  (when (> (count (boards)) 1)
    (swap! state (fn [s] (let [bs (vec (remove #(= (:id %) id) (:boards s)))]
                           (cond-> (assoc s :boards bs) (= (:active-board s) id) (assoc :active-board (:id (first bs)))))))
    (persist!) (render-boards!)
    true))

(defn switch-board! [id]
  (click-sound! 550 0.06)
  (when (some #(= (:id %) id) (boards)) (swap! state assoc :active-board id))
  (render-boards!))

(defn add-column! [board-id name]
  (let [clean (str/trim (str name))]
    (when (and (seq clean) (some #(= (:id %) board-id) (boards)))
      (click-sound! 650 0.08)
      (let [col {:id (make-id) :name (subs clean 0 (min 40 (count clean))) :cards []}]
        (update-board board-id #(update % :columns conj col))
        (persist!) (render-boards!)
        col))))

(defn delete-column! [board-id col-id]
  (let [b (some #(when (= (:id %) board-id) %) (boards))]
    (when (and b (> (count (:columns b)) 1) (some #(= (:id %) col-id) (:columns b)))
      (update-board board-id
                    (fn [b] (let [gone (some #(when (= (:id %) col-id) %) (:columns b))
                                  cols (vec (remove #(= (:id %) col-id) (:columns b)))]
                              ;; its cards move to the first column
                              (assoc b :columns (update-in cols [0 :cards] into (:cards gone))))))
      (persist!) (render-boards!)
      true)))

(defn add-card! [board-id col-id {:keys [title due desc color]}]
  (let [title (str/trim (str title)) due (or due "")
        b (some #(when (= (:id %) board-id) %) (boards))]
    (when (and b (some #(= (:id %) col-id) (:columns b)) (seq title) (or (= due "") (parse-date due)))
      (let [card {:id (make-id) :title (subs title 0 (min 120 (count title))) :due due
                  :desc (let [d (str desc)] (subs d 0 (min 2000 (count d)))) :color (if (shade? color) color "")}]
        (update-cards board-id #(if (= (:id %) col-id) (update % :cards conj card) %))
        (persist!) (redraw!)
        card))))

(defn update-card! [board-id card-id {:keys [title due desc color]}]
  (when (find-card board-id card-id)
    (let [title (some-> title str str/trim)]
      (when (and (not= title "") (or (nil? due) (= due "") (parse-date due)))
        (update-cards board-id
                      (fn [col] (update col :cards (fn [cs] (mapv #(if (= (:id %) card-id)
                                                                     (cond-> %
                                                                       title (assoc :title (subs title 0 (min 120 (count title))))
                                                                       (some? due) (assoc :due due)
                                                                       (some? desc) (assoc :desc (subs (str desc) 0 (min 2000 (count (str desc)))))
                                                                       (some? color) (assoc :color (if (shade? color) color "")))
                                                                     %) cs)))))
        (persist!) (redraw!)
        true))))

(defn delete-card! [board-id card-id]
  (when (find-card board-id card-id)
    (update-cards board-id (fn [col] (update col :cards (fn [cs] (vec (remove #(= (:id %) card-id) cs))))))
    (persist!) (redraw!)
    true))

(defn move-card! [board-id card-id to-col-id]
  (when-let [{:keys [board col card]} (find-card board-id card-id)]
    (when (some #(= (:id %) to-col-id) (:columns board))
      (when (not= (:id col) to-col-id)
        (update-cards board-id (fn [c] (cond
                                         (= (:id c) (:id col)) (update c :cards (fn [cs] (vec (remove #(= (:id %) card-id) cs))))
                                         (= (:id c) to-col-id) (update c :cards conj card)
                                         :else c)))
        (persist!)
        (when (= (:view @state) "boards") (render-boards!)))
      true)))

(defn el [tag cls text]
  (let [e (.createElement js/document tag)]
    (when cls (set! (.-className e) cls))
    (when text (set! (.-textContent e) text))
    e))

(defn render-boards! []
  (ensure-boards!)
  (let [board (active-board)
        select ($ "board-select")
        wrap ($ "board-columns")]
    (set! (.-innerHTML select)
          (apply str (for [b (boards)] (str "<option value=\"" (:id b) "\"" (when (= (:id b) (:id board)) " selected") ">" (esc (:name b)) "</option>"))))
    (set! (.-innerText ($ "board-count")) (str (reduce + (map #(count (:cards %)) (:columns board))) " Cards"))
    (set! (.-innerHTML wrap) "")
    (doseq [col (:columns board)]
      (let [col-div (el "div" "board-column" nil)
            head (el "div" "column-head" (str (:name col) " (" (count (:cards col)) ")"))
            del-col (el "button" nil "✕")
            add (el "button" "kanban-add" "＋ Add card")]
        (set! (.-ondragover col-div) #(.preventDefault %))
        (set! (.-ondrop col-div)
              (fn [e]
                (.preventDefault e)
                (try
                  (let [payload (js/JSON.parse (.getData (.-dataTransfer e) "text/plain"))]
                    (when (and payload (.-cardId payload))
                      (click-sound! 600 0.06)
                      (move-card! (:id board) (.-cardId payload) (:id col))))
                  (catch :default _ nil))))
        (set! (.-title del-col) "Delete column!")
        (set! (.-onclick del-col) #(do (click-sound! 400 0.08) (delete-column! (:id board) (:id col))))
        (.appendChild head del-col)
        (.appendChild col-div head)
        (doseq [card (:cards col)]
          (let [late? (and (seq (:due card)) (overdue? (:due card)))
                c (el "div" (str "kanban-card" (when late? " overdue")) nil)
                title (el "div" nil (:title card))]
            (set! (.-draggable c) true)
            (set! (.-ondragstart c) #(.setData (.-dataTransfer %) "text/plain" (js/JSON.stringify #js {:boardId (:id board) :cardId (:id card)})))
            (set! (.. title -style -fontWeight) "800")
            (.appendChild c title)
            (when (seq (:due card))
              (.appendChild c (el "div" (str "kanban-due" (when late? " late")) (str "📅 " (:due card)))))
            (set! (.-onclick c) #(open-card-modal! (:id board) (:id col) card))
            (.appendChild col-div c)))
        (set! (.-onclick add) #(open-card-modal! (:id board) (:id col) nil))
        (.appendChild col-div add)
        (.appendChild wrap col-div))))
  (doseq [f @boards-hooks] (f)))

(defn ask-add-board! [] (let [n (js/prompt "Board name:")] (when (and n (seq (str/trim n))) (add-board! n))))
(defn ask-delete-board! []
  (let [b (active-board)]
    (click-sound! 400 0.08)
    (when (js/confirm (str "Delete board \"" (:name b) "\" and all its cards?")) (delete-board! (:id b)))))
(defn ask-add-column! [] (let [n (js/prompt "Column name:")] (when (and n (seq (str/trim n))) (add-column! (:id (active-board)) n))))
(defn ask-delete-column! [board-id col-id] (click-sound! 400 0.08) (delete-column! board-id col-id))

;; ---------- The card window ----------
(defn open-card-modal! [board-id col-id card]
  (let [card (cond (map? card) card (some? card) (from-js card) :else nil)]
    (swap! state assoc :editing-card {:board-id board-id :col-id col-id :card-id (:id card)}
           :pending-card-color (if (shade? (:color card)) (:color card) "") :color-target "card")
    (set! (.-innerText ($ "card-modal-title-text")) (if card "Edit Card" "Add Card"))
    (set! (.-value ($ "card-title")) (or (:title card) ""))
    (set! (.-value ($ "card-due")) (or (:due card) ""))
    (set! (.-value ($ "card-desc")) (or (:desc card) ""))
    (paint-color-button!)
    (when-let [popup ($ "event-color-popup")] (set! (.. popup -style -display) "none"))
    (set! (.. ($ "card-modal") -style -display) "flex")))

(defn close-card-modal! [] (set! (.. ($ "card-modal") -style -display) "none"))

(defn save-card! []
  (let [title (.-value ($ "card-title")) due (.-value ($ "card-due")) desc (.-value ($ "card-desc"))
        color (let [c (:pending-card-color @state)] (if (shade? c) c ""))
        {:keys [board-id col-id card-id] :as editing} (:editing-card @state)]
    (if (or (str/blank? title) (and (not= due "") (not (parse-date due))))
      (js/alert "Give the card a title and a valid due date!")
      (do (click-sound! 700 0.08)
          (cond card-id (update-card! board-id card-id {:title title :due due :desc desc :color color})
                editing (add-card! board-id col-id {:title title :due due :desc desc :color color}))
          (close-card-modal!)
          (render-boards!)))))

(defn edit-card! [board-id col-id card-id]
  (when-let [{:keys [card]} (find-card board-id card-id)] (open-card-modal! board-id col-id card)))
(defn ask-delete-card! [board-id card-id] (click-sound! 400 0.08) (delete-card! board-id card-id))

;; ---------- Files ----------
(defn download! [blob filename]
  (let [a (.createElement js/document "a")]
    (set! (.-href a) (js/URL.createObjectURL blob))
    (set! (.-download a) filename)
    (.click a)))

(defn export-ics! []
  (click-sound! 750 0.12)
  (download! (js/Blob. #js [(ics-content (events))] #js {:type "text/calendar"}) "hexa-calendar.ics"))

;; Hexa snapshot format (.KH): EVERYTHING in one file, boards included!
(defn kh [] {:app "Hexa" :version "1.0" :exportedAt (.toISOString (js/Date.)) :events (events) :boards (boards) :activeBoardId (:active-board @state)})

(defn apply-kh! [doc]
  (let [doc (from-js doc)]
    (when (and (map? doc) (contains? #{nil "Hexa"} (:app doc))
               (or (nil? (:events doc)) (vector? (:events doc)))
               (or (nil? (:boards doc)) (vector? (:boards doc))))
      (when (some? (:events doc)) (swap! state assoc :events (clean-events (:events doc))))
      (when (some? (:boards doc))
        (swap! state assoc :boards (clean-boards (:boards doc)))
        (when (string? (:activeBoardId doc)) (swap! state assoc :active-board (:activeBoardId doc)))
        (ensure-boards!))
      (or (some? (:events doc)) (some? (:boards doc))))))

(defn export-kh! []
  (click-sound! 750 0.12)
  (download! (js/Blob. #js [(js/JSON.stringify (clj->js (kh)) nil 2)] #js {:type "application/json"}) "hexa-calendar.kh"))

(defn read-file! [evt on-text]
  (click-sound! 850 0.15)
  (when-let [file (aget (.. evt -target -files) 0)]
    (let [reader (js/FileReader.)]
      (set! (.-onload reader) #(on-text (.. % -target -result)))
      (.readAsText reader file))))

(defn import-kh! [evt]
  (read-file! evt (fn [text]
                    (try
                      (if (apply-kh! (js/JSON.parse text))
                        (do (persist!) (render!) (when (= (:view @state) "boards") (render-boards!))
                            (js/alert "Hexa file (.kh) loaded successfully!"))
                        (js/alert "Invalid .kh file format."))
                      (catch :default _ (js/alert "Invalid .kh file format."))))))

(defn import-ics! [evt]
  (read-file! evt (fn [text]
                    (try
                      (let [incoming (parse-ics text)]
                        (swap! state update :events into incoming)
                        (persist!) (render!)
                        (js/alert (str "Imported " (count incoming) " events!")))
                      (catch :default _ (js/alert "Invalid .ics file format."))))))

;; ---------- The page's onclick handlers call these by their old names! ----------
(doseq [[k f] {"shiftMonth" shift-month! "goToday" go-today! "pickDay" pick-day! "openEventModal" open-event-modal!
               "closeEventModal" close-event-modal! "saveEvent" save-event! "editEvent" edit-event! "askDeleteEvent" ask-delete-event!
               "askClearCalendar" ask-clear-calendar! "exportICS" export-ics! "importICS" import-ics! "exportKH" export-kh!
               "importKH" import-kh! "setViewMode" set-view-mode! "switchBoard" switch-board! "askAddBoard" ask-add-board!
               "askDeleteBoard" ask-delete-board! "askAddColumn" ask-add-column! "askDeleteColumn" ask-delete-column!
               "openCardModal" open-card-modal! "closeCardModal" close-card-modal! "saveCard" save-card! "editCard" edit-card!
               "askDeleteCard" ask-delete-card! "toggleColorPopup" toggle-color-popup!}]
  (aset js/window k f))

(let [t (js/Date.)]
  (swap! state assoc :year (.getFullYear t) :month (.getMonth t) :selected (today-str)))
(restore!)
(ensure-boards!)
(when ($ "hexa-grid") (render!))
