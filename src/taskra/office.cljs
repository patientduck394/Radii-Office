;; Taskra's To Do layout, in ClojureScript! An indigo ribbon (Home, Share, Help), a File screen
;; for .TK files and a status bar with the task counts, on top of Taskra's own list.
;; Taskra Classic stays one click away! (The ribbon itself is the shared office-shell.js!)
(ns taskra.office
  (:require [taskra.app :as app]))

(defn greet []
  (let [h (.getHours (js/Date.))]
    (cond (< h 12) "Good morning" (< h 18) "Good afternoon" :else "Good evening")))

(defn plural [n word] (str n " " word (when (not= n 1) "s")))

(defn pick-tk! [] (some-> (app/$ "file-tk") .click))

(def filter-list [["all" "All Tasks" "lines"] ["active" "Active" "play"] ["done" "Done" "check"] ["overdue" "Overdue" "clock"]])

(defn start! [OS]
  (let [set-f! (fn [m] (app/set-filter! m) (.sync OS))
        filter-now #(:filter @app/state)
        clear-done! (fn []
                      (if-not (some :done (app/tasks))
                        (.toast OS "No completed tasks to clear!")
                        (.then (.confirm OS "Clear Completed" "Delete all completed tasks?" "Delete" true)
                               (fn [ok] (when ok (app/clear-completed!) (.toast OS "Completed tasks cleared!"))))))
        cards (fn [items] (.bsCards OS (clj->js items)))
        backstage [{:id "home" :label "Home" :icon "home"
                    :render (fn [b]
                              (set! (.-innerHTML b) (str "<h1>" (greet) "!</h1>"))
                              (.appendChild b (cards [{:label "New task" :hint "Add something to do!" :icon "todo" :run #(do (.closeBackstage OS) (app/open-task-modal!))}
                                                      {:label "Import .TK" :hint "Open a Taskra file!" :icon "folder" :run #(do (.closeBackstage OS) (pick-tk!))}
                                                      {:label "Export .TK" :hint "Save a copy!" :icon "save" :run app/export-tasks!}]))
                              (let [{:keys [total done overdue]} (app/counts)]
                                (.insertAdjacentHTML b "beforeend"
                                                     (str "<h2>Your list</h2><div class=\"bb-bs-doc tk-bs-doc\"><img src=\"favicon-96.png\" alt=\"\"><div><b>" (plural total "task")
                                                          "</b><span>" done " done · " overdue " overdue · saved in this browser!</span></div></div>"))))}
                   {:id "import" :label "Import" :icon "import"
                    :render (fn [b]
                              (set! (.-innerHTML b) "<h1>Import</h1>")
                              (.appendChild b (cards [{:label ".TK file" :hint "Replaces your list with the file's tasks!" :icon "folder" :run #(do (.closeBackstage OS) (pick-tk!))}])))}
                   {:id "export" :label "Export" :icon "export"
                    :render (fn [b]
                              (set! (.-innerHTML b) "<h1>Export</h1>")
                              (.appendChild b (cards [{:label ".TK file" :hint "Every task, re-importable!" :icon "save" :run app/export-tasks!}])))}
                   {:id "info" :label "Info" :icon "info"
                    :render (fn [b]
                              (let [{:keys [total done overdue]} (app/counts)]
                                (set! (.-innerHTML b) (str "<h1>Info</h1><table class=\"bb-wc\"><tr><td>Tasks</td><td><b>" total "</b></td></tr><tr><td>Done</td><td><b>" done
                                                           "</b></td></tr><tr><td>Overdue</td><td><b>" overdue "</b></td></tr></table>"))))}]
        tabs [{:id "home" :label "Home"
               :groups [{:label "New" :items [{:big true :icon "todo" :label "New\nTask" :run #(app/open-task-modal!)}]}
                        {:label "Show" :items (for [[id label icon] filter-list]
                                                {:big true :icon icon :label (.replace label " " "\n") :run #(set-f! id) :checked #(= (filter-now) id)})}
                        {:label "Tidy Up" :items [{:big true :icon "trash" :label "Clear\nCompleted" :run clear-done!}]}
                        {:label "Layout" :items [{:big true :icon "layout" :label "Layout"
                                                  :menu #(clj->js [{:label "To Do" :checked true :icon "layout" :run (fn [] (.setLayout OS "office"))}
                                                                   {:label "Taskra Classic" :icon "sparkle" :run (fn [] (.setLayout OS "classic"))}])}]}]}
              {:id "share" :label "Share"
               :groups [{:label "Live" :items [{:big true :icon "user" :label "Share &\nChat" :title "Work through the list together, live!"
                                                :run #(some-> (.-RadiiCollab js/window) (.open "people"))}]}
                        {:label "File" :items [{:big true :icon "save" :label "Export\n.TK" :run app/export-tasks!}
                                               {:big true :icon "folder" :label "Import\n.TK" :run pick-tk!}]}]}
              {:id "help" :label "Help"
               :groups [{:label "Tips" :items [{:big true :icon "help" :label "Quick\nTips"
                                                :run #(.dialog OS "Taskra tips" "<p class=\"os-dlg-text\">Tick a task to finish it, edit it with the pencil, and search from the box above the list. Share &amp; Chat lets everyone tick and add tasks live!</p>"
                                                               (clj->js [{:label "Got it!" :primary true :value true}]))}]}]}]]
    (.init OS (clj->js
               {:app "Taskra"
                :officeName "To Do"
                :kind "onenote"
                :key "taskra"
                :icon "favicon-96.png"
                :officeHint "An indigo ribbon with filters, a File screen and a status bar, like To Do!"
                :classicHint "The original Taskra: indigo glass sidebar and gel buttons!"
                :classicToast "Taskra Classic: indigo glass and gel!"
                :theme {:accent "#6366f1" :accent-d "#4f46e5" :accent-l "#e0e7ff" :title "#5558e3" :gel1 "#a5b4fc" :gel2 "#6366f1"
                        :gel-border "#c7d2fe" :gel-glow "rgba(99, 102, 241, 0.45)" :glow "rgba(224, 231, 255, 0.9)" :thumb-bg "#1e1b4b"}
                :editor (constantly nil)
                :title (constantly "My Tasks")
                :qat [{:icon "save" :title "Export .TK" :run #(do (app/export-tasks!) (.flashSaved OS "Saved!"))}
                      {:icon "todo" :title "New task" :run #(app/open-task-modal!)}]
                :tabs tabs
                :backstage backstage
                :status #(let [{:keys [total done overdue]} (app/counts)]
                           (clj->js [(str "<b>" total "</b> task" (when (not= total 1) "s")) (str "<b>" done "</b> done") (str "<b>" overdue "</b> overdue")]))
                :views (for [[id label icon] filter-list]
                         {:icon icon :title label :run #(set-f! id) :active #(= (filter-now) id)})
                :searchExtra (fn [q]
                               (clj->js (->> (app/tasks)
                                             (filter #(.includes (.toLowerCase (:title %)) q))
                                             (take 6)
                                             (map (fn [t] {:label (str "Task \"" (:title t) "\"") :icon "todo" :where "Tasks"
                                                           :it {:run #(app/edit-task! (:id t))}})))))}))
    ;; Taskra Classic gets a Layout button too!
    (when-let [stack (.querySelector js/document ".aero-sidebar .pad-selection-stack")]
      (let [b (.createElement js/document "button")]
        (set! (.-type b) "button")
        (set! (.-className b) "action-btn tk-classic-layout")
        (set! (.-textContent b) "🧩 Layout")
        (.addEventListener b "click"
                           (fn []
                             (let [box (.createElement js/document "div")]
                               (set! (.-innerHTML box) "<p class=\"os-dlg-text\">Pick a layout! Your tasks stay exactly the same!</p>")
                               (.appendChild box (.layoutCards OS))
                               (.dialog OS "Layout — To Do or Taskra Classic" box (clj->js [{:label "Done" :primary true :value true}]) #js {:cls "tk-layout-dlg"})
                               (js/setTimeout (.-syncLayoutCards OS) 0))))
        (.appendChild stack b)))
    (swap! app/render-hooks conj #(.sync OS))))

(when-let [OS (.-OfficeShell js/window)]
  (start! OS))
