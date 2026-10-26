//> using scala 3.3.4
//> using platform scala-js
//> using dep org.scala-js::scalajs-dom::2.8.0

// The "Find an app" bar on the Products page, written in Scala and compiled to JavaScript with Scala.js!
// It reads the product cards that are already on the page, so adding a card to products.html is all it takes.
import org.scalajs.dom
import org.scalajs.dom.{document, html}

object ProductFinder:
  final case class Card(el: html.Element, title: String, badge: String, badgeLabel: String, text: String)

  private def norm(s: String): String = s.toLowerCase.replaceAll("\\s+", " ").trim

  // Every word has to match somewhere; the title counts most, then the badge, then the description.
  private def score(c: Card, words: Seq[String]): Option[Int] =
    words.foldLeft(Option(0)) { (acc, w) =>
      acc.flatMap { s =>
        if c.title.contains(w) then Some(s + 10)
        else if c.badge.contains(w) then Some(s + 5)
        else if c.text.contains(w) then Some(s + 1)
        else None
      }
    }

  private val Css =
    """.rf-finder{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0 auto 22px;max-width:1100px}
      |.rf-search{flex:1 1 260px;min-width:0;font:inherit;font-size:15px;padding:11px 16px;border-radius:999px;border:1px solid rgba(56,189,248,.45);background:rgba(15,23,42,.65);color:#e2e8f0;outline:none;box-shadow:inset 0 1px 3px rgba(0,0,0,.4)}
      |.rf-search::placeholder{color:#94a3b8}
      |.rf-search:focus{border-color:#0ea5e9;box-shadow:0 0 0 3px rgba(14,165,233,.25)}
      |.rf-count{font-size:13px;color:#bae6fd;white-space:nowrap}
      |.rf-chips{display:flex;flex-wrap:wrap;gap:6px;flex-basis:100%}
      |.rf-chip{font:inherit;font-size:12px;font-weight:700;padding:5px 12px;border-radius:999px;border:1px solid rgba(56,189,248,.35);background:rgba(15,23,42,.6);color:#bae6fd;cursor:pointer}
      |.rf-chip:hover{border-color:#38bdf8}
      |.rf-chip[aria-pressed="true"]{background:linear-gradient(180deg,#38bdf8,#0369a1);color:#fff;border-color:transparent}
      |.rf-empty{grid-column:1/-1;text-align:center;padding:30px;color:#bae6fd}
      |.rf-hide{display:none!important}""".stripMargin

  def main(args: Array[String]): Unit =
    if document.readyState == dom.DocumentReadyState.loading then document.addEventListener("DOMContentLoaded", (_: dom.Event) => start())
    else start()

  private def start(): Unit =
    val grid = document.querySelector(".product-grid")
    if grid == null then return
    def textOf(el: dom.Element, sel: String): String = Option(el.querySelector(sel)).map(_.textContent).getOrElse("")
    val cards = (0 until document.querySelectorAll(".product-card").length).map { i =>
      val el = document.querySelectorAll(".product-card")(i).asInstanceOf[html.Element]
      val badge = textOf(el, ".badge-btn").trim
      Card(el, norm(textOf(el, ".product-title")), norm(badge), badge, norm(el.textContent))
    }

    val style = document.createElement("style")
    style.textContent = Css
    document.head.appendChild(style)

    val bar = document.createElement("div").asInstanceOf[html.Div]
    bar.className = "rf-finder"
    val search = document.createElement("input").asInstanceOf[html.Input]
    search.`type` = "search"
    search.className = "rf-search"
    search.placeholder = "Find an app… (press / to search)"
    search.setAttribute("aria-label", "Find an app")
    val count = document.createElement("span").asInstanceOf[html.Span]
    count.className = "rf-count"
    count.setAttribute("aria-live", "polite")
    val chips = document.createElement("div").asInstanceOf[html.Div]
    chips.className = "rf-chips"
    chips.setAttribute("role", "group")
    chips.setAttribute("aria-label", "Filter by kind")
    bar.appendChild(search)
    bar.appendChild(count)
    bar.appendChild(chips)
    grid.parentNode.insertBefore(bar, grid)
    val empty = document.createElement("p").asInstanceOf[html.Paragraph]
    empty.className = "rf-empty rf-hide"
    empty.textContent = "No app matches that! Try another word!"
    grid.appendChild(empty)

    var chip = ""
    val labels = "" +: cards.map(_.badgeLabel).filter(_.nonEmpty).distinct
    val chipButtons = labels.map { label =>
      val b = document.createElement("button").asInstanceOf[html.Button]
      b.`type` = "button"
      b.className = "rf-chip"
      b.textContent = if label.isEmpty then "All" else label
      b.setAttribute("aria-pressed", (label == chip).toString)
      chips.appendChild(b)
      label -> b
    }

    def render(): Unit =
      val words = norm(search.value).split(' ').toSeq.filter(_.nonEmpty)
      val hits = cards.flatMap(c => score(c, words).filter(_ => chip.isEmpty || c.badge == norm(chip)).map(c -> _))
      val shown = hits.map(_._1).toSet
      cards.foreach(c => c.el.classList.toggle("rf-hide", !shown.contains(c)))
      // best matches first while searching; the page's own order otherwise
      if words.nonEmpty then hits.sortBy(-_._2).foreach((c, _) => grid.insertBefore(c.el, empty))
      else cards.foreach(c => grid.insertBefore(c.el, empty))
      empty.classList.toggle("rf-hide", shown.nonEmpty)
      count.textContent = if shown.size == cards.size then s"${cards.size} apps" else s"${shown.size} of ${cards.size} apps"
      chipButtons.foreach((label, b) => b.setAttribute("aria-pressed", (label == chip).toString))

    chipButtons.foreach((label, b) => b.addEventListener("click", (_: dom.Event) => { chip = label; render() }))
    search.addEventListener("input", (_: dom.Event) => render())
    search.addEventListener("keydown", (e: dom.KeyboardEvent) => if e.key == "Escape" then { search.value = ""; render() })
    document.addEventListener("keydown", (e: dom.KeyboardEvent) =>
      val t = e.target.asInstanceOf[dom.Element]
      val typing = t != null && (t.tagName == "INPUT" || t.tagName == "TEXTAREA" || t.asInstanceOf[html.Element].isContentEditable)
      if e.key == "/" && !typing then { e.preventDefault(); search.focus() }
    )
    render()
