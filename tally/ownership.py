"""Effective ownership from direct percentage links.

The traversal multiplies percentages along each path and sums paths that
end at the same person. Cycles are reported and not followed again.
A company with no owners above it is a gap, not a forced percentage.
"""


def _key(name: str) -> str:
    return " ".join((name or "").lower().split())


def effective_owners(links: list[dict], subject: str) -> dict:
    by_owned: dict[str, list[dict]] = {}
    for link in links:
        by_owned.setdefault(_key(link["owned"]), []).append(link)

    totals: dict[str, float] = {}
    kinds: dict[str, str] = {}
    cycles: list[str] = []
    gaps: list[dict] = []

    def walk(node: str, display: str, pct: float, path: tuple[str, ...], kind: str) -> None:
        owners = by_owned.get(_key(node), [])
        if not owners:
            if kind == "company" and _key(node) != _key(subject):
                gaps.append({
                    "name": display,
                    "missing_document": f"Register of members of {display}",
                })
            else:
                totals[display] = totals.get(display, 0) + pct
                kinds[display] = kind
            return
        for link in owners:
            owner = link["owner"]
            if _key(owner) in path:
                cycles.append(" → ".join((*path, owner)))
                continue
            share = float(link["percent"]) / 100.0
            walk(owner, owner, pct * share, (*path, _key(owner)), link.get("owner_kind", "person"))

    walk(subject, subject, 100.0, (_key(subject),), "company")
    people = [
        {"name": name, "percent": round(pct, 2), "kind": kinds.get(name, "person")}
        for name, pct in sorted(totals.items(), key=lambda item: -item[1])
        if kinds.get(name, "person") == "person"
    ]
    return {"people": people, "cycles": cycles, "gaps": gaps}
