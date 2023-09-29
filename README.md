# Proof Tables

A simple interactive tool for proof tables.
Proof tables are a visual representation of formal proofs.
You have the assumptions (your current context) on the left,
the goal to prove in the middle and what you do (the rules) on the right.

Proof tables are well-suited to learn how proofs work formally and internally.
As such, they are often used in didactical contexts to introduce formalism and proof techniques.
Two such examples are the "Mathematics Preparatory Course" and the "Introduction to Computational Logic" course as Saarland University.

Internally, we handle the goal as Coq lemma and the rules as Coq tactics.
We then use the information Coq provides to fill out the table.
As such, our tables allow to use all of Coq including automation and advanced tactics.

To do so, we make heavy use of JsCoq. However, we had to hack it as JsCoq natively only
exposes a high-level API to turn a website into a Coq worksheet.


TODOs:
- [ ] recognize errors semantically (and display them) -- add error adapter to observer
- [ ] find out why assumptions with same type are hidden
- [ ] add custom definitions (<, >, >=, odd)
- [x] make firefox work
- [x] allow to change the goal
- [x] handle split tables 
- [x] mark in table if split -> thicker line when goal count changes
- [x] check assumption name and type to make sure
- [x] Advanced Assumption Parsing
- [ ] Export as
    - [x] Coq + Nested
    - [x] Markdown
    - [x] Latex
    - [ ] State
    - [ ] Image
- [ ] load Coq scripts in interface
    - [ ] input preamble