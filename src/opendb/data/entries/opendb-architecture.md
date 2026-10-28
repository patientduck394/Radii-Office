---
id: opendb-architecture
type: paper
title: "A public-domain knowledge base without a server"
summary: How OpenDB stores articles, media and papers as reviewable text files and serves them as a static site with instant client-side search.
abstract: Open knowledge projects usually depend on a database server, which brings hosting costs, operational risk and a single point of failure. We describe OpenDB, a public-domain (CC0) knowledge base that needs none. Each entry is a plain text file with a short header of facts followed by Markdown content. A build step compiles all entries into one index file that a static website loads once and searches entirely in the browser. Contributions are prepared in the browser, saved locally right away, and submitted as reviewable changes to a public repository, so history, moderation and backups come from version control. We discuss the trade-offs of this design, including slower publication and the size limits of a single index, and why dedicating everything to the public domain simplifies reuse.
tags: [open access, digital libraries, web]
categories: [cs.DL, cs.IR]
created: 2026-10-27
updated: 2026-10-27
authors: [Radii Office contributors]
license: CC0-1.0
---
## 1. Motivation

Encyclopedias, media archives and preprint servers share a goal: make knowledge easy to find and reuse. Running them usually means operating databases and servers. [[opendb|OpenDB]] explores a smaller design that can be hosted on any static web host.

## 2. Entries as text files

Every entry is a text file. A header lists its id, type (article, media or paper), title, summary, tags, dates, authors and license, followed by Markdown content. Files are easy to read, review and edit, and every change is recorded by version control.

## 3. One index, searched in the browser

A build script parses every entry, checks required fields, rejects any license other than CC0, and writes a single index file. The site downloads this file once and keeps it in memory. Search scores titles, tags, summaries and full text, so results appear as you type without any server round trip.

## 4. Contributions

The editor shows a live preview and requires the contributor to dedicate the work to the public domain. The entry is saved on the contributor's device immediately and can be submitted as a proposed new file to the public repository. A maintainer reviews it, then rebuilds the index.

## 5. Trade-offs

Publication waits for review instead of being instant, and one index file eventually becomes large. Splitting the index by collection or first letter, and loading full text only on demand, would let the design grow much further.

## 6. Why CC0

Because every entry is dedicated to the [[public-domain|public domain]] under [[cc0|CC0]], reusers never need to track attribution or license versions, which removes the most common barrier to reusing open material.
