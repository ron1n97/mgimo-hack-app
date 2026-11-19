#!/usr/bin/env python3
"""OR-Tools CP-SAT sidecar for ADR 0011 timetable model (v0 subset).

Reads JSON instance from stdin (same shape as SolverInstance), writes SolverResult JSON.
Hard: H1 assignment, H2 teacher, H3 room, H4 cohort (+conflicts), H5 capacity, H8 elig.
Soft: gap-teach, dept (linear scalars via lambdas).
"""
from __future__ import annotations

import json
import sys
import time
from typing import Any

try:
    from ortools.sat.python import cp_model
except ImportError:  # pragma: no cover
    print(json.dumps({
        "status": "ERROR",
        "engine": "cpsat",
        "assignments": [],
        "objective": 1e18,
        "soft": {"gapTeach": 0, "load": 0, "dept": 0, "gapStud": 0, "building": 0, "total": 1e18},
        "message": "ortools not installed",
        "elapsedMs": 0,
    }))
    sys.exit(2)


def slots_overlap(a: dict, b: dict) -> bool:
    return a["startMin"] < b["endMin"] and b["startMin"] < a["endMin"]


def solve(instance: dict[str, Any]) -> dict[str, Any]:
    t0 = time.time()
    slots = instance["slots"]
    rooms = instance["rooms"]
    teachers = instance["teachers"]
    activities = instance["activities"]
    conflicts = set()
    for a, b in instance.get("cohortConflicts", []):
        conflicts.add((a, b))
        conflicts.add((b, a))
    lambdas = {
        "gapTeach": 10,
        "load": 5,
        "dept": 8,
        "gapStud": 3,
        "building": 2,
        **(instance.get("lambdas") or {}),
    }

    model = cp_model.CpModel()
    # x[a,s,r,p]
    x: dict[tuple[str, str, str, str], Any] = {}
    for act in activities:
        elig = act.get("eligibleTeacherIds") or [t["id"] for t in teachers]
        for slot in slots:
            for room in rooms:
                if (not room.get("isVirtual")) and room["capacity"] < act["headcount"]:
                    continue
                for tid in elig:
                    if not any(t["id"] == tid for t in teachers):
                        continue
                    var = model.NewBoolVar(f"x_{act['id']}_{slot['id']}_{room['id']}_{tid}")
                    x[(act["id"], slot["id"], room["id"], tid)] = var

    # H1
    for act in activities:
        vars_a = [v for (aid, *_), v in x.items() if aid == act["id"]]
        if not vars_a:
            return _err("no domain for activity " + act["id"], t0)
        model.Add(sum(vars_a) == 1)

    # H2 teacher
    for t in teachers:
        for i, s1 in enumerate(slots):
            for s2 in slots[i + 1 :]:
                if not slots_overlap(s1, s2):
                    continue
                clash = [
                    v
                    for (aid, sid, rid, tid), v in x.items()
                    if tid == t["id"] and sid in (s1["id"], s2["id"])
                ]
                if clash:
                    model.Add(sum(clash) <= 1)

    # H3 room
    for room in rooms:
        if room.get("isVirtual"):
            continue
        for slot in slots:
            clash = [
                v
                for (aid, sid, rid, tid), v in x.items()
                if rid == room["id"] and sid == slot["id"]
            ]
            if clash:
                model.Add(sum(clash) <= 1)

    # H4 cohort self + conflicts
    cohort_ids = {a["cohortId"] for a in activities}
    for c in cohort_ids:
        acts = [a["id"] for a in activities if a["cohortId"] == c]
        for slot in slots:
            clash = [
                v
                for (aid, sid, rid, tid), v in x.items()
                if aid in acts and sid == slot["id"]
            ]
            if clash:
                model.Add(sum(clash) <= 1)
    for c1, c2 in list(conflicts):
        if c1 >= c2:
            continue
        acts1 = {a["id"] for a in activities if a["cohortId"] == c1}
        acts2 = {a["id"] for a in activities if a["cohortId"] == c2}
        for slot in slots:
            clash = [
                v
                for (aid, sid, rid, tid), v in x.items()
                if sid == slot["id"] and (aid in acts1 or aid in acts2)
            ]
            if clash:
                model.Add(sum(clash) <= 1)

    # Soft: dept mismatch
    dept_pen = []
    act_by = {a["id"]: a for a in activities}
    teach_by = {t["id"]: t for t in teachers}
    for (aid, sid, rid, tid), v in x.items():
        act = act_by[aid]
        teach = teach_by[tid]
        if act.get("dept") and teach.get("dept") and act["dept"] != teach["dept"]:
            dept_pen.append(v)

    # Soft: teacher gaps — approximate by rewarding packing (minimize span-count)
    # Use linear proxy: number of occupied (teacher,day,ord) already counted;
    # minimize sum of slot.ord * assignment as weak packing signal + dept.
    gap_proxy = []
    for (aid, sid, rid, tid), v in x.items():
        slot = next(s for s in slots if s["id"] == sid)
        gap_proxy.append(slot["ord"] * v)

    model.Minimize(
        int(lambdas["dept"]) * sum(dept_pen)
        + int(lambdas["gapTeach"]) * sum(gap_proxy)
    )

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = float(instance.get("timeLimitSec") or 10)
    solver.parameters.num_search_workers = 2
    status = solver.Solve(model)
    elapsed = int((time.time() - t0) * 1000)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return {
            "status": "INFEASIBLE",
            "engine": "cpsat",
            "assignments": [],
            "objective": 1e18,
            "soft": {"gapTeach": 0, "load": 0, "dept": 0, "gapStud": 0, "building": 0, "total": 1e18},
            "message": f"CP-SAT status={solver.StatusName(status)}",
            "elapsedMs": elapsed,
        }

    assignments = []
    for (aid, sid, rid, tid), v in x.items():
        if solver.Value(v) == 1:
            assignments.append(
                {"activityId": aid, "slotId": sid, "roomId": rid, "teacherId": tid}
            )

    dept = sum(
        1
        for asg in assignments
        if act_by[asg["activityId"]].get("dept")
        and teach_by[asg["teacherId"]].get("dept")
        and act_by[asg["activityId"]]["dept"] != teach_by[asg["teacherId"]]["dept"]
    )
    obj = float(solver.ObjectiveValue())
    return {
        "status": "FEASIBLE",
        "engine": "cpsat",
        "assignments": assignments,
        "objective": obj,
        "soft": {
            "gapTeach": 0,
            "load": 0,
            "dept": dept,
            "gapStud": 0,
            "building": 0,
            "total": obj,
        },
        "elapsedMs": elapsed,
    }


def _err(msg: str, t0: float) -> dict[str, Any]:
    return {
        "status": "ERROR",
        "engine": "cpsat",
        "assignments": [],
        "objective": 1e18,
        "soft": {"gapTeach": 0, "load": 0, "dept": 0, "gapStud": 0, "building": 0, "total": 1e18},
        "message": msg,
        "elapsedMs": int((time.time() - t0) * 1000),
    }


def main() -> None:
    instance = json.load(sys.stdin)
    json.dump(solve(instance), sys.stdout)


if __name__ == "__main__":
    main()
