;; The "Tip of the day" card on the home page, written in Clojure!
;; Scittle (a ClojureScript interpreter that runs in the browser) loads and runs this file as it is.
(ns radii.tips)

(def tips
  ["In Bitbook or Omicron, type ::aqua and press Space to turn text into a glossy chip!"
   "Bitbook's Programs skill lets you write little games in BitLang, then click the chip to play them!"
   "Share & Chat lets you edit together in real time, and every message is end-to-end encrypted!"
   "Mainkey can host a database straight from your browser tab: click 📡 Host and share the snippet!"
   "Annotate in Bitbook has over 30 highlight styles, from Gel Bubble to Gel Torpedo!"
   "Omicron exports your page as a ZIP or as one HTML file with every style built in!"
   "Every app has a Classic toggle, so you can switch between the Office ribbon and the classic look!"
   "Want to see how it all works? The Source Code page lets you download the whole suite!"
   "BitLang programs can call Python, Lua, SQLite and even your own Julia server with a single use line!"
   "On the Products page, press / to search every app!"])

(defn day-number []
  (js/Math.floor (/ (.now js/Date) 86400000)))

(defonce state (atom {:i (mod (day-number) (count tips))}))

(defn el [tag class-name text]
  (let [e (.createElement js/document tag)]
    (set! (.-className e) class-name)
    (when text (set! (.-textContent e) text))
    e))

(defn render! [{:keys [i]}]
  (when-let [text (.querySelector js/document ".rt-text")]
    (set! (.-textContent text) (nth tips i))
    (set! (.-textContent (.querySelector js/document ".rt-count"))
          (str (inc i) " / " (count tips)))))

(defn step! [n]
  (swap! state update :i #(mod (+ % n) (count tips))))

(defn button [label title n]
  (let [b (el "button" "rt-btn" label)]
    (set! (.-type b) "button")
    (.setAttribute b "aria-label" title)
    (.addEventListener b "click" #(step! n))
    b))

(defn mount! []
  (when-let [anchor (.querySelector js/document ".hero-text-block")]
    (when-not (.querySelector js/document ".rt-card")
      (let [card (el "aside" "rt-card" nil)
            head (el "div" "rt-head" nil)]
        (.setAttribute card "aria-label" "Tip of the day")
        (.append head (el "span" "rt-title" "💡 Tip of the day") (el "span" "rt-count" ""))
        (.append card head
                 (doto (el "p" "rt-text" "") (.setAttribute "aria-live" "polite"))
                 (doto (el "div" "rt-nav" nil)
                   (.append (button "‹ Back" "Previous tip" -1)
                            (button "Next ›" "Next tip" 1))))
        (.append anchor card)
        (add-watch state ::render (fn [_ _ _ new-state] (render! new-state)))
        (render! @state)))))

(mount!)
