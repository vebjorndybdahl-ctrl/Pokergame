---
title: Pot odds og outs
tier: viderekommen
order: 2
summary: Den enkle matten som forteller deg når en call lønner seg – og kalkulatoren som gjør den for deg.
minutes: 8
---

Dette er øyeblikket poker går fra magefølelse til matte. Det høres skummelt ut, men det
er bare deling. Når du forstår **pot odds**, slutter du å gjette på om en call er riktig.

## Outs: kortene som redder deg

En **out** er et kort som gir deg den beste hånden. Eksempel: du har fire kort til en
flush etter floppen. Det er 13 kort i hver sort, du ser fire av dem, så **9 kort** igjen
i kortstokken fullfører flushen din. Du har 9 outs.

Vanlige tilfeller:

| Situasjon | Outs |
| --- | --- |
| Flush-draw (fire til flush) | 9 |
| Åpen straight-draw | 8 |
| Gutshot (hull i midten) | 4 |
| To overkort | 6 |

## Fra outs til sjanse: 2- og 4-regelen

En rask snarvei alle proffer bruker:

- **På floppen** (to kort igjen å komme): outs × **4** ≈ % sjanse for å treffe.
- **På turn** (ett kort igjen): outs × **2** ≈ % sjanse.

9 outs på floppen → ca. 36 % sjanse for å treffe flushen innen river.

## Pot odds: lønner callen seg?

Pot odds sammenligner hva du må betale med hva du kan vinne. Hvis potten er 100 kr og du
må betale 25 kr for å bli med, betaler du 25 inn i en pott som blir 125 – du trenger å
vinne **20 %** av gangene for å gå i null.

**Regelen:** hvis sjansen for å treffe (fra outs) er **større** enn pot odds du betaler,
er callen lønnsom i lengden. Hvis ikke, fold.

## Prøv den

```widget
odds-calculator
```

> **Viktig nyanse:** dette regner bare på *neste* kort. Av og til betaler du litt for mye
> akkurat nå, men vinner stort når du treffer (**implied odds**) – fordi motstanderen
> betaler deg ut på river. Erfaring lærer deg når du kan strekke matten.

I neste leksjon: hvordan du faktisk leser hva motstanderen kan ha.
