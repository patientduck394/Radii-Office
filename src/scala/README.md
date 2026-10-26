# Scala.js: the "Find an app" bar on the Products page!

`ProductFinder.scala` is real Scala 3, compiled to JavaScript with Scala.js. It powers the search box and the
category chips above the app cards on `products.html` (press `/` to jump into it)!

Files:
- `ProductFinder.scala`: the source (reads the cards already on the page, so new cards are picked up automatically)!
- `product-finder.js`: the compiled, optimized output (Scala.js + Google Closure), served as-is by the static site!

Rebuild (needs [Scala CLI](https://scala-cli.virtuslab.org); it downloads Java and Scala.js by itself):
```sh
cd scala
scala-cli --power package --js --js-mode release ProductFinder.scala -o product-finder.js -f
rm -rf .scala-build .bsp
```
