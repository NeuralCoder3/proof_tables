(*
Require Import Classical.
Require Import Lia.
Require Import Nat PeanoNat.
Import Nat.
*)
(* Require Import ssreflect ssrbool. *)

Ltac get_name := fresh "H0".

(*
Assumption H
φ | φ
*)
Ltac assumption H :=
  exact H.

(*
TruthIntro
 | ⊤
*)
Ltac truth_intro :=
  exact I.

(*
FalsityElim
⊥ | χ
*)
Ltac falsity_elim H :=
  exfalso; exact H.

(*
AndElim H
φ ∧ ψ | χ
φ, ψ  | χ
*)
Definition and_elim {A B P} H :=
  fun R => @and_rect A B P R H.
Ltac and_elim H :=
  let H1 := fresh in
  let H2 := get_name in
  let H3 := get_name in
  pose proof H as H1;
  apply (and_elim H1); clear H1;
  intros H2 H3.
  (* destruct H1 as [H2 H3]. *)

(*
AndIntro
 | φ ∧ ψ
1) | φ
2) | ψ
*)
Ltac and_intro :=
  conj.
  (* split. *)

(*
OrElim H
φ ∨ ψ | χ
1) φ | χ
2) ψ | χ
*)
Ltac or_elim H :=
  let H2 := fresh in
  let H3 := get_name in
  let H4 := get_name in
  pose proof H as H2;
  destruct H2 as [H3 | H4].

(*
OrIntro1
 | φ ∨ ψ
 | φ
*)
Ltac or_intro1 :=
  left.

(*
OrIntro2
 | φ ∨ ψ
 | ψ
*)
Ltac or_intro2 :=
  right.

(*
ImplApply H
φ → ψ | ψ
      | φ 
*)
Ltac impl_apply H :=
  apply H.

(*
ImplSpecialize H H2
φ → ψ, φ | χ
ψ | χ
*)
Ltac impl_specialize H H2 :=
  let H3 := get_name in
  pose proof H as H3;
  specialize (H3 H2).

(*
ImplIntro
  | φ → ψ
1) φ | ψ
*)
Ltac impl_intro :=
  let H := get_name in
  intro H.

(*
NegElim H
¬φ | χ
φ → ⊥ | χ
*)
Ltac neg_elim H :=
  let H2 := get_name in
  pose proof H as H2;
  unfold not in H2.

(*
NegIntro
 | ¬φ
φ | ⊥
*)
Ltac neg_intro :=
  let H := get_name in
  unfold not; intro H.


(*
Assert φ
 | χ
1) | φ
2) φ | χ
*)
(* already exists *)

(*
ExcludedMiddle φ
 | χ
1) ¬φ | χ
2) φ | χ
*)
Ltac excluded_middle H :=
  let H2 := get_name in
  let H3 := get_name in
  destruct (classic H) as [H2 | H3].

(*
ForallIntro n
    | ∀x. φ
y:object | φ[y/x]
*)
Ltac forall_intro y :=
  intro y.

(*
ForallElim t
∀x. φ | χ
φ[t/x] | χ
*)
Ltac forall_elim H t :=
  let H2 := get_name in
  pose proof H as H2;
  specialize (H2 t).

(*
ExistsIntro t
| ∃x. φ
| φ[t/x]
*)
Ltac exists_intro t :=
  exists t.

(*
ExistsElim
∃x. φ | χ
y:object, φ[t/x] | χ
*)
Definition exists_elim {A P Q} H :=
  fun R => @ex_ind A P Q R H.
Ltac exists_elim H y :=
  let H2 := get_name in
  pose proof H as H2;
  apply (exists_elim H2); clear H2;
  intros y H2.
  (* destruct H2 as [y H2]. *)

(*
EqualsIntro
| t = t
*)
Ltac equals_intro :=
  reflexivity.

(*
EqualsElim
t = u | χ
| χ'
*)
(* rename rewrite to equals_elim (including optional <- arrow) *)
Ltac equals_elim H :=
  rewrite H.
Ltac equals_elim_rev H :=
  rewrite <- H.

(* Additional tactics used but not on sheet *)
(*
Axiom
Defn
*)
Ltac defn H :=
  unfold H in *.

Ltac axiom H :=
  (* assert H by admit. *)
  let A := fresh "A0" in
  pose proof H as A.