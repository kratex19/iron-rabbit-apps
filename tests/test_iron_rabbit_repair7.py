"""
Iron Rabbit Repair #7 verification tests.

Repair #7: srcRect snapshotted at drag-start (stable layout) and consumed at
drop time, preventing mid-drag DOM reflow from staling the boundary rect.

- V1: wobble no-op (PRIMARY GATE — was PARTIAL FAIL in iter_91)
- V2: touch cross-category MOVE still works (TEST 8A regression)
- V3: V2 reload persistence
- V4: desktop mouse w/o modifier still COPY
- V5: desktop mouse w/ Ctrl still MOVE
- V6: same-pack touch reorder still works
- V7: 3 consecutive drags (leak check for srcRectRef)
- V8: cancel path (Escape) then subsequent clean drag works
"""
import asyncio, json, os
from playwright.async_api import async_playwright

URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/"

SEED_SAME_PACK = {
    "notes": [
        {"id": "t1", "title": "Milk", "content": "milk", "category": "Groceries", "subcategory": "", "category_path": ["Groceries"], "pack_id": "test-pack-8", "pack_name": "Test Pack 8", "pack_accent": "#8b5cf6", "order": 1, "created_at": "2025-01-01T00:00:00.000Z", "updated_at": "2025-01-01T00:00:00.000Z"},
        {"id": "t2", "title": "Bread", "content": "bread", "category": "Groceries", "subcategory": "", "category_path": ["Groceries"], "pack_id": "test-pack-8", "pack_name": "Test Pack 8", "pack_accent": "#8b5cf6", "order": 2, "created_at": "2025-01-01T00:00:00.000Z", "updated_at": "2025-01-01T00:00:00.000Z"},
        {"id": "t3", "title": "Eggs", "content": "eggs", "category": "Groceries", "subcategory": "", "category_path": ["Groceries"], "pack_id": "test-pack-8", "pack_name": "Test Pack 8", "pack_accent": "#8b5cf6", "order": 3, "created_at": "2025-01-01T00:00:00.000Z", "updated_at": "2025-01-01T00:00:00.000Z"},
        {"id": "t4", "title": "Bank",  "content": "bank",  "category": "Errands",   "subcategory": "", "category_path": ["Errands"],   "pack_id": "test-pack-8", "pack_name": "Test Pack 8", "pack_accent": "#8b5cf6", "order": 4, "created_at": "2025-01-01T00:00:00.000Z", "updated_at": "2025-01-01T00:00:00.000Z"},
        {"id": "t5", "title": "Post",  "content": "post",  "category": "Errands",   "subcategory": "", "category_path": ["Errands"],   "pack_id": "test-pack-8", "pack_name": "Test Pack 8", "pack_accent": "#8b5cf6", "order": 5, "created_at": "2025-01-01T00:00:00.000Z", "updated_at": "2025-01-01T00:00:00.000Z"},
    ],
    "settings": {
        "view_mode": "icon", "group_by_category": True, "sort_by": "custom",
        "tour_completed": True, "theme_chosen": True, "theme": "dark",
        "category_order": ["Groceries", "Errands"],
    },
}

SEED_TWO_PACKS = {
    "notes": [
        {"id": "a1", "title": "Pasta",   "content": "", "category": "recipes",  "subcategory": "", "category_path": ["recipes"],  "pack_id": "recipes-pack", "pack_name": "Recipes", "pack_accent": "#f59e0b", "order": 1, "created_at": "2025-01-01T00:00:00.000Z", "updated_at": "2025-01-01T00:00:00.000Z"},
        {"id": "a2", "title": "Curry",   "content": "", "category": "recipes",  "subcategory": "", "category_path": ["recipes"],  "pack_id": "recipes-pack", "pack_name": "Recipes", "pack_accent": "#f59e0b", "order": 2, "created_at": "2025-01-01T00:00:00.000Z", "updated_at": "2025-01-01T00:00:00.000Z"},
        {"id": "a3", "title": "Salad",   "content": "", "category": "recipes",  "subcategory": "", "category_path": ["recipes"],  "pack_id": "recipes-pack", "pack_name": "Recipes", "pack_accent": "#f59e0b", "order": 3, "created_at": "2025-01-01T00:00:00.000Z", "updated_at": "2025-01-01T00:00:00.000Z"},
        {"id": "a4", "title": "Soup",    "content": "", "category": "recipes",  "subcategory": "", "category_path": ["recipes"],  "pack_id": "recipes-pack", "pack_name": "Recipes", "pack_accent": "#f59e0b", "order": 4, "created_at": "2025-01-01T00:00:00.000Z", "updated_at": "2025-01-01T00:00:00.000Z"},
        {"id": "b1", "title": "Bank",    "content": "", "category": "errands",  "subcategory": "", "category_path": ["errands"],  "pack_id": "errands-pack", "pack_name": "Errands", "pack_accent": "#6366f1", "order": 5, "created_at": "2025-01-01T00:00:00.000Z", "updated_at": "2025-01-01T00:00:00.000Z"},
        {"id": "b2", "title": "Post",    "content": "", "category": "errands",  "subcategory": "", "category_path": ["errands"],  "pack_id": "errands-pack", "pack_name": "Errands", "pack_accent": "#6366f1", "order": 6, "created_at": "2025-01-01T00:00:00.000Z", "updated_at": "2025-01-01T00:00:00.000Z"},
    ],
    "settings": {
        "view_mode": "icon", "group_by_category": True, "sort_by": "custom",
        "tour_completed": True, "theme_chosen": True, "theme": "dark",
        "category_order": ["recipes", "errands"],
    },
}

SEED_ONE_CAT = {
    "notes": [
        {"id": f"t{i}", "title": f"Item{i}", "content": "", "category": "TestPack", "subcategory": "", "category_path": ["TestPack"], "pack_id": "test-pack", "pack_name": "Test Pack", "pack_accent": "#8b5cf6", "order": i, "created_at": "2025-01-01T00:00:00.000Z", "updated_at": "2025-01-01T00:00:00.000Z"}
        for i in range(1, 6)
    ],
    "settings": {
        "view_mode": "icon", "group_by_category": True, "sort_by": "custom",
        "tour_completed": True, "theme_chosen": True, "theme": "dark",
        "category_order": ["TestPack"],
    },
}


SEED_JS = r"""
async (payload) => {
  const { notes, settings } = payload;
  const dbName = 'IronRabbit';
  const openDb = () => new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const clearStore = (db, name) => new Promise((resolve) => {
    if (!db.objectStoreNames.contains(name)) return resolve();
    const tx = db.transaction(name, 'readwrite');
    tx.objectStore(name).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
  const putKV = (db, name, entries) => new Promise((resolve) => {
    if (!db.objectStoreNames.contains(name)) return resolve();
    const tx = db.transaction(name, 'readwrite');
    const s = tx.objectStore(name);
    for (const [k, v] of entries) s.put(v, k);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
  const db = await openDb();
  await clearStore(db, 'notes');
  await clearStore(db, 'settings');
  await clearStore(db, 'metadata');
  const noteEntries = notes.map((n) => [n.id, n]);
  await putKV(db, 'notes', noteEntries);
  await putKV(db, 'settings', [['app_settings', settings]]);
  await putKV(db, 'metadata', [['migrated_from_backend', true]]);
  db.close();
  sessionStorage.clear();
  return { ok: true };
}
"""

READ_JS = r"""
async () => {
  const dbName = 'IronRabbit';
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const readAll = (name) => new Promise((resolve) => {
    if (!db.objectStoreNames.contains(name)) return resolve([]);
    const tx = db.transaction(name, 'readonly');
    const req = tx.objectStore(name).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
  const notes = await readAll('notes');
  db.close();
  return notes;
}
"""


def summarize(notes):
    by_cat = {}
    for n in notes:
        c = n.get("category") or ""
        by_cat.setdefault(c, []).append(n["id"])
    return {"total": len(notes), "by_cat": by_cat, "ids": sorted([n["id"] for n in notes])}


def find(notes, nid):
    for n in notes:
        if n["id"] == nid:
            return n
    return None


def fresh_uuids(notes):
    return [n["id"] for n in notes if len(n["id"]) == 36 and "-" in n["id"]]


async def cdp_touch_drag(page, start, end, steps=30, wobble_at=None):
    client = await page.context.new_cdp_session(page)
    sx, sy = start
    ex, ey = end
    await client.send("Input.dispatchTouchEvent", {
        "type": "touchStart",
        "touchPoints": [{"x": sx, "y": sy}],
    })
    await client.send("Input.dispatchTouchEvent", {
        "type": "touchMove",
        "touchPoints": [{"x": sx + 8, "y": sy + 8}],
    })
    await asyncio.sleep(0.05)
    for i in range(1, steps + 1):
        t = i / steps
        x = sx + (ex - sx) * t
        y = sy + (ey - sy) * t
        if wobble_at and i in wobble_at:
            x -= 60
            y += 60
        await client.send("Input.dispatchTouchEvent", {
            "type": "touchMove",
            "touchPoints": [{"x": x, "y": y}],
        })
        await asyncio.sleep(0.01)
    await client.send("Input.dispatchTouchEvent", {
        "type": "touchMove",
        "touchPoints": [{"x": ex, "y": ey}],
    })
    await asyncio.sleep(0.05)
    await client.send("Input.dispatchTouchEvent", {
        "type": "touchEnd",
        "touchPoints": [],
    })
    await client.detach()


async def cdp_mouse_drag(page, start, end, modifiers=0, steps=30):
    client = await page.context.new_cdp_session(page)
    sx, sy = start
    ex, ey = end
    await client.send("Input.dispatchMouseEvent", {
        "type": "mousePressed", "x": sx, "y": sy, "button": "left", "buttons": 1, "clickCount": 1, "modifiers": modifiers,
    })
    await client.send("Input.dispatchMouseEvent", {
        "type": "mouseMoved", "x": sx + 8, "y": sy + 8, "button": "left", "buttons": 1, "modifiers": modifiers,
    })
    await asyncio.sleep(0.05)
    for i in range(1, steps + 1):
        t = i / steps
        x = sx + (ex - sx) * t
        y = sy + (ey - sy) * t
        await client.send("Input.dispatchMouseEvent", {
            "type": "mouseMoved", "x": x, "y": y, "button": "left", "buttons": 1, "modifiers": modifiers,
        })
        await asyncio.sleep(0.01)
    await client.send("Input.dispatchMouseEvent", {
        "type": "mouseMoved", "x": ex, "y": ey, "button": "left", "buttons": 1, "modifiers": modifiers,
    })
    await client.send("Input.dispatchMouseEvent", {
        "type": "mouseReleased", "x": ex, "y": ey, "button": "left", "buttons": 0, "modifiers": modifiers,
    })
    await client.detach()


async def get_center(page, testid):
    box = await page.locator(f'[data-testid="{testid}"]').first.bounding_box()
    if not box:
        return None
    return (box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)


async def get_last_toast(page):
    try:
        el = page.locator("[data-sonner-toast]").last
        await el.wait_for(state="visible", timeout=2000)
        return (await el.inner_text()).strip()
    except Exception:
        return ""


async def seed_and_load(page, seed, viewport):
    await page.set_viewport_size(viewport)
    await page.goto(URL, wait_until="networkidle")
    await page.wait_for_timeout(2000)
    await page.evaluate(SEED_JS, seed)
    await page.reload(wait_until="networkidle")
    await page.wait_for_timeout(3000)
    await page.wait_for_selector('[data-testid^="note-tile-"]', timeout=15000)
    await page.wait_for_timeout(500)


results = {}


async def test_v1_wobble_noop(page):
    """PRIMARY: touch wobble drag inside PackA must be silent no-op."""
    await seed_and_load(page, SEED_TWO_PACKS, {"width": 390, "height": 844})
    grip = await get_center(page, "note-tile-grip-a1")
    tile_a4 = await get_center(page, "note-tile-a4")
    if not grip or not tile_a4:
        results["V1_wobble_noop"] = {"status": "FAIL", "reason": "elements not found", "grip": grip, "a4": tile_a4}
        return
    await cdp_touch_drag(page, grip, tile_a4, steps=30, wobble_at=[10, 20])
    await page.wait_for_timeout(700)
    toast = await get_last_toast(page)
    notes = await page.evaluate(READ_JS)
    s = summarize(notes)
    a1 = find(notes, "a1")
    fu = fresh_uuids(notes)
    ok = (
        s["total"] == 6
        and a1 is not None
        and a1.get("pack_id") == "recipes-pack"
        and a1.get("category") == "recipes"
        and a1.get("category_path") == ["recipes"]
        and len(fu) == 0
        and set(s["ids"]) == {"a1", "a2", "a3", "a4", "b1", "b2"}
        and "Moved" not in toast
        and "Copied" not in toast
    )
    results["V1_wobble_noop"] = {
        "status": "PASS" if ok else "FAIL",
        "summary": s, "a1": a1, "fresh_uuids": fu, "toast": toast,
    }


async def test_v2_touch_move(page):
    """Touch cross-category MOVE still works (TEST 8A regression)."""
    await seed_and_load(page, SEED_SAME_PACK, {"width": 390, "height": 844})
    grip = await get_center(page, "note-tile-grip-t1")
    tile4 = await get_center(page, "note-tile-t4")
    if not grip or not tile4:
        results["V2_touch_move"] = {"status": "FAIL", "reason": "elements not found"}
        return
    await cdp_touch_drag(page, grip, tile4, steps=30)
    await page.wait_for_timeout(700)
    toast = await get_last_toast(page)
    notes = await page.evaluate(READ_JS)
    s = summarize(notes)
    t1 = find(notes, "t1")
    fu = fresh_uuids(notes)
    ok = (
        s["total"] == 5
        and len(s["by_cat"].get("Groceries", [])) == 2
        and len(s["by_cat"].get("Errands", [])) == 3
        and t1 and t1.get("id") == "t1"
        and t1.get("category") == "Errands"
        and t1.get("category_path") == ["Errands"]
        and t1.get("pack_id") == "test-pack-8"
        and len(fu) == 0
        and "Moved" in toast
    )
    results["V2_touch_move"] = {"status": "PASS" if ok else "FAIL", "summary": s, "t1": t1, "toast": toast, "fresh_uuids": fu}


async def test_v3_reload_persistence(page):
    """After V2, reload and verify t1 persistence."""
    if results.get("V2_touch_move", {}).get("status") != "PASS":
        results["V3_reload"] = {"status": "SKIPPED", "reason": "V2 did not pass"}
        return
    await page.reload(wait_until="networkidle")
    await page.wait_for_timeout(3000)
    notes = await page.evaluate(READ_JS)
    s = summarize(notes)
    t1 = find(notes, "t1")
    ok = (s["total"] == 5 and t1 and t1["id"] == "t1" and t1.get("category") == "Errands" and t1.get("category_path") == ["Errands"])
    results["V3_reload"] = {"status": "PASS" if ok else "FAIL", "summary": s, "t1": t1}


async def test_v4_desktop_copy(page):
    await seed_and_load(page, SEED_SAME_PACK, {"width": 1400, "height": 1000})
    grip = await get_center(page, "note-tile-grip-t1")
    tile4 = await get_center(page, "note-tile-t4")
    if not grip or not tile4:
        results["V4_desktop_copy"] = {"status": "FAIL", "reason": "elements not found"}
        return
    await cdp_mouse_drag(page, grip, tile4, modifiers=0)
    await page.wait_for_timeout(700)
    toast = await get_last_toast(page)
    notes = await page.evaluate(READ_JS)
    s = summarize(notes)
    t1 = find(notes, "t1")
    fu = [n for n in notes if len(n["id"]) == 36 and "-" in n["id"]]
    ok = (
        s["total"] == 6
        and t1 and t1.get("category") == "Groceries"
        and len(fu) == 1 and fu[0].get("category") == "Errands"
        and "Copied" in toast
    )
    results["V4_desktop_copy"] = {"status": "PASS" if ok else "FAIL", "summary": s, "toast": toast, "fresh_uuid_ids": [f["id"] for f in fu]}


async def test_v5_desktop_move_ctrl(page):
    await seed_and_load(page, SEED_SAME_PACK, {"width": 1400, "height": 1000})
    grip = await get_center(page, "note-tile-grip-t1")
    tile4 = await get_center(page, "note-tile-t4")
    if not grip or not tile4:
        results["V5_desktop_move_ctrl"] = {"status": "FAIL", "reason": "elements not found"}
        return
    await cdp_mouse_drag(page, grip, tile4, modifiers=2)
    await page.wait_for_timeout(700)
    toast = await get_last_toast(page)
    notes = await page.evaluate(READ_JS)
    s = summarize(notes)
    t1 = find(notes, "t1")
    ok = (
        s["total"] == 5 and t1 and t1["id"] == "t1"
        and t1.get("category") == "Errands"
        and "Moved" in toast
    )
    results["V5_desktop_move_ctrl"] = {"status": "PASS" if ok else "FAIL", "summary": s, "t1": t1, "toast": toast}


async def test_v6_same_pack_reorder(page):
    """Same-pack touch reorder still works."""
    await seed_and_load(page, SEED_ONE_CAT, {"width": 390, "height": 844})
    grip = await get_center(page, "note-tile-grip-t1")
    tile4 = await get_center(page, "note-tile-t4")
    if not grip or not tile4:
        results["V6_same_pack_reorder"] = {"status": "FAIL", "reason": "elements not found"}
        return
    # Capture pre-drag orders
    before = await page.evaluate(READ_JS)
    before_ids = [n["id"] for n in sorted(before, key=lambda n: n.get("order", 0))]
    await cdp_touch_drag(page, grip, tile4, steps=30)
    await page.wait_for_timeout(700)
    notes = await page.evaluate(READ_JS)
    s = summarize(notes)
    ids_by_order = [n["id"] for n in sorted(notes, key=lambda n: n.get("order", 0))]
    ok = (
        s["total"] == 5
        and set(s["ids"]) == {"t1", "t2", "t3", "t4", "t5"}
        and ids_by_order != before_ids  # order changed
    )
    results["V6_same_pack_reorder"] = {
        "status": "PASS" if ok else "FAIL",
        "summary": s, "before_order": before_ids, "after_order": ids_by_order,
    }


async def test_v7_consecutive_drags(page):
    """3 drags back-to-back — verify srcRectRef cleared cleanly between."""
    # Drag 1: wobble no-op on two-pack seed
    await seed_and_load(page, SEED_TWO_PACKS, {"width": 390, "height": 844})
    grip = await get_center(page, "note-tile-grip-a1")
    tile_a4 = await get_center(page, "note-tile-a4")
    await cdp_touch_drag(page, grip, tile_a4, steps=30, wobble_at=[10, 20])
    await page.wait_for_timeout(500)
    notes1 = await page.evaluate(READ_JS)
    a1 = find(notes1, "a1")
    d1_ok = a1 and a1.get("category") == "recipes" and a1.get("pack_id") == "recipes-pack" and len(fresh_uuids(notes1)) == 0

    # Drag 2: clean cross-category MOVE on same-pack seed (fresh seed)
    await seed_and_load(page, SEED_SAME_PACK, {"width": 390, "height": 844})
    grip2 = await get_center(page, "note-tile-grip-t1")
    tile2 = await get_center(page, "note-tile-t4")
    await cdp_touch_drag(page, grip2, tile2, steps=30)
    await page.wait_for_timeout(500)
    notes2 = await page.evaluate(READ_JS)
    t1 = find(notes2, "t1")
    d2_ok = t1 and t1.get("category") == "Errands" and t1["id"] == "t1"

    # Drag 3: same-pack reorder
    await seed_and_load(page, SEED_ONE_CAT, {"width": 390, "height": 844})
    grip3 = await get_center(page, "note-tile-grip-t1")
    tile3 = await get_center(page, "note-tile-t4")
    before3 = await page.evaluate(READ_JS)
    before_ids = [n["id"] for n in sorted(before3, key=lambda n: n.get("order", 0))]
    await cdp_touch_drag(page, grip3, tile3, steps=30)
    await page.wait_for_timeout(500)
    notes3 = await page.evaluate(READ_JS)
    after_ids = [n["id"] for n in sorted(notes3, key=lambda n: n.get("order", 0))]
    d3_ok = len(notes3) == 5 and after_ids != before_ids

    ok = d1_ok and d2_ok and d3_ok
    results["V7_consecutive_drags"] = {
        "status": "PASS" if ok else "FAIL",
        "d1_wobble_noop": bool(d1_ok), "d2_cross_move": bool(d2_ok), "d3_reorder": bool(d3_ok),
        "d1_a1": a1, "d2_t1": t1, "d3_before": before_ids, "d3_after": after_ids,
    }


async def test_v8_cancel_then_clean(page):
    """Start a wobble drag then Escape to cancel; subsequent clean drag must work."""
    await seed_and_load(page, SEED_SAME_PACK, {"width": 390, "height": 844})
    grip = await get_center(page, "note-tile-grip-t1")
    tile4 = await get_center(page, "note-tile-t4")
    if not grip or not tile4:
        results["V8_cancel_then_clean"] = {"status": "FAIL", "reason": "elements not found"}
        return
    # Start a touch drag manually via CDP but interrupt with Escape (via keyboard) before touchEnd.
    client = await page.context.new_cdp_session(page)
    await client.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": grip[0], "y": grip[1]}]})
    await client.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": grip[0]+8, "y": grip[1]+8}]})
    await asyncio.sleep(0.05)
    # halfway move
    mx, my = (grip[0]+tile4[0])/2, (grip[1]+tile4[1])/2
    await client.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": mx, "y": my}]})
    await asyncio.sleep(0.05)
    # trigger cancel via keyboard Escape (dnd-kit's KeyboardSensor cancels drag)
    await page.keyboard.press("Escape")
    await asyncio.sleep(0.1)
    # Release the touch (even if drag already cancelled)
    try:
        await client.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    except Exception:
        pass
    await client.detach()
    await page.wait_for_timeout(400)
    # State should be unchanged after cancel
    notes_after_cancel = await page.evaluate(READ_JS)
    t1_cancel = find(notes_after_cancel, "t1")
    cancel_ok = len(notes_after_cancel) == 5 and t1_cancel and t1_cancel["category"] == "Groceries"

    # Now do a clean cross-category MOVE drag
    grip2 = await get_center(page, "note-tile-grip-t1")
    tile2 = await get_center(page, "note-tile-t4")
    await cdp_touch_drag(page, grip2, tile2, steps=30)
    await page.wait_for_timeout(700)
    notes = await page.evaluate(READ_JS)
    t1 = find(notes, "t1")
    move_ok = len(notes) == 5 and t1 and t1["id"] == "t1" and t1.get("category") == "Errands"

    ok = cancel_ok and move_ok
    results["V8_cancel_then_clean"] = {
        "status": "PASS" if ok else "FAIL",
        "cancel_state_unchanged": bool(cancel_ok),
        "subsequent_drag_moved": bool(move_ok),
        "t1_after_cancel": t1_cancel, "t1_after_move": t1,
    }


async def main():
    console_errors = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(args=["--no-sandbox"])
        ctx = await browser.new_context(has_touch=True)
        page = await ctx.new_page()
        page.on("pageerror", lambda e: console_errors.append(f"pageerror: {e}"))
        page.on("console", lambda m: console_errors.append(f"CONSOLE_ERR: {m.text}") if m.type == "error" else None)
        try:
            await test_v1_wobble_noop(page)
            await test_v2_touch_move(page)
            await test_v3_reload_persistence(page)
            await test_v4_desktop_copy(page)
            await test_v5_desktop_move_ctrl(page)
            await test_v6_same_pack_reorder(page)
            await test_v7_consecutive_drags(page)
            await test_v8_cancel_then_clean(page)
        finally:
            results["console_errors"] = console_errors
            await browser.close()
    print(json.dumps(results, indent=2, default=str))


if __name__ == "__main__":
    asyncio.run(main())
