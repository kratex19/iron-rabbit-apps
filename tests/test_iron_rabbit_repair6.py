"""
Iron Rabbit Repair #6 verification tests.

- TEST 8A: touch cross-category MUST MOVE (not COPY)
- TEST 8A-RELOAD: state persists after reload
- DESKTOP REG 1: desktop mouse w/o modifier still COPY
- DESKTOP REG 2: desktop mouse w/ Ctrl still MOVE
- REPAIR #5 CO-EXISTENCE: touch wobble inside source pack -> no-op

Runs via asyncio Playwright directly (not pytest) — the harness expects
the top-level `page` variable in async context. This file is self-contained
and invoked from a wrapper.
"""
import asyncio, json, os, sys
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


SEED_JS = r"""
async (payload) => {
  const { notes, settings } = payload;
  // The app uses localforage which creates a keyPath-less object store per
  // instance. We open the existing 'IronRabbit' DB (already provisioned by
  // the app's first load) and write with out-of-line keys via put(value,key).
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
  const stores = Array.from(db.objectStoreNames);
  await clearStore(db, 'notes');
  await clearStore(db, 'settings');
  await clearStore(db, 'metadata');
  const noteEntries = notes.map((n) => [n.id, n]);
  await putKV(db, 'notes', noteEntries);
  await putKV(db, 'settings', [['app_settings', settings]]);
  await putKV(db, 'metadata', [['migrated_from_backend', true]]);
  db.close();
  sessionStorage.clear();
  return { ok: true, stores };
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


async def cdp_touch_drag(page, start, end, steps=30, wobble_at=None):
    """Dispatch a real touch drag via Chrome DevTools Protocol."""
    client = await page.context.new_cdp_session(page)
    sx, sy = start
    ex, ey = end
    # touchStart
    await client.send("Input.dispatchTouchEvent", {
        "type": "touchStart",
        "touchPoints": [{"x": sx, "y": sy}],
    })
    # activation nudge (dnd-kit activationConstraint)
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
            # wobble deep by (60,60) offset back toward source
            x -= 60
            y += 60
        await client.send("Input.dispatchTouchEvent", {
            "type": "touchMove",
            "touchPoints": [{"x": x, "y": y}],
        })
        await asyncio.sleep(0.01)
    # final touchMove at target
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
    # activation nudge
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
        await el.wait_for(state="visible", timeout=3000)
        return (await el.inner_text()).strip()
    except Exception:
        return ""


async def seed_and_load(page, seed, viewport):
    await page.set_viewport_size(viewport)
    # First load to establish IDB
    await page.goto(URL, wait_until="networkidle")
    await page.wait_for_timeout(2000)
    await page.evaluate(SEED_JS, seed)
    await page.reload(wait_until="networkidle")
    await page.wait_for_timeout(3000)
    # Wait for tiles
    await page.wait_for_selector('[data-testid^="note-tile-t"], [data-testid^="note-tile-a"]', timeout=15000)
    await page.wait_for_timeout(500)


results = {}


async def test_8a(page, console_errors):
    await seed_and_load(page, SEED_SAME_PACK, {"width": 390, "height": 844})
    grip = await get_center(page, "note-tile-grip-t1")
    tile4 = await get_center(page, "note-tile-t4")
    if not grip or not tile4:
        results["TEST_8A"] = {"status": "FAIL", "reason": "elements not found", "grip": grip, "t4": tile4}
        return
    await cdp_touch_drag(page, grip, tile4, steps=30)
    await page.wait_for_timeout(700)
    toast = await get_last_toast(page)
    notes = await page.evaluate(READ_JS)
    s = summarize(notes)
    t1 = find(notes, "t1")
    fresh_uuid = [n["id"] for n in notes if len(n["id"]) == 36 and "-" in n["id"]]
    ok = (
        s["total"] == 5
        and len(s["by_cat"].get("Groceries", [])) == 2
        and len(s["by_cat"].get("Errands", [])) == 3
        and t1 is not None
        and t1.get("category") == "Errands"
        and t1.get("category_path") == ["Errands"]
        and t1.get("subcategory") == ""
        and t1.get("pack_id") == "test-pack-8"
        and t1.get("title") == "Milk"
        and len(fresh_uuid) == 0
        and "Moved" in toast
    )
    results["TEST_8A"] = {
        "status": "PASS" if ok else "FAIL",
        "summary": s, "t1": t1, "fresh_uuids": fresh_uuid, "toast": toast,
        "console_errors": list(console_errors),
    }


async def test_8a_reload(page):
    await page.reload(wait_until="networkidle")
    await page.wait_for_timeout(3000)
    notes = await page.evaluate(READ_JS)
    s = summarize(notes)
    t1 = find(notes, "t1")
    ok = (
        s["total"] == 5
        and len(s["by_cat"].get("Groceries", [])) == 2
        and len(s["by_cat"].get("Errands", [])) == 3
        and t1 and t1.get("category") == "Errands" and t1.get("id") == "t1"
    )
    results["TEST_8A_RELOAD"] = {"status": "PASS" if ok else "FAIL", "summary": s, "t1": t1}


async def test_desktop_copy(page):
    await seed_and_load(page, SEED_SAME_PACK, {"width": 1400, "height": 1000})
    grip = await get_center(page, "note-tile-grip-t1")
    tile4 = await get_center(page, "note-tile-t4")
    if not grip or not tile4:
        results["DESKTOP_COPY"] = {"status": "FAIL", "reason": "elements not found"}
        return
    await cdp_mouse_drag(page, grip, tile4, modifiers=0)
    await page.wait_for_timeout(700)
    toast = await get_last_toast(page)
    notes = await page.evaluate(READ_JS)
    s = summarize(notes)
    t1 = find(notes, "t1")
    fresh_uuid = [n for n in notes if len(n["id"]) == 36 and "-" in n["id"]]
    ok = (
        s["total"] == 6
        and t1 and t1.get("category") == "Groceries"
        and len(fresh_uuid) == 1
        and fresh_uuid[0].get("category") == "Errands"
        and fresh_uuid[0].get("title") == "Milk"
        and "Copied" in toast
    )
    results["DESKTOP_COPY"] = {"status": "PASS" if ok else "FAIL", "summary": s, "t1_cat": t1 and t1["category"], "fresh_uuid": [f["id"] for f in fresh_uuid], "toast": toast}


async def test_desktop_move_ctrl(page):
    await seed_and_load(page, SEED_SAME_PACK, {"width": 1400, "height": 1000})
    grip = await get_center(page, "note-tile-grip-t1")
    tile4 = await get_center(page, "note-tile-t4")
    if not grip or not tile4:
        results["DESKTOP_MOVE_CTRL"] = {"status": "FAIL", "reason": "elements not found"}
        return
    # modifiers bitmask 2 = Ctrl in CDP
    await cdp_mouse_drag(page, grip, tile4, modifiers=2)
    await page.wait_for_timeout(700)
    toast = await get_last_toast(page)
    notes = await page.evaluate(READ_JS)
    s = summarize(notes)
    t1 = find(notes, "t1")
    ok = (
        s["total"] == 5
        and t1 and t1.get("id") == "t1"
        and t1.get("category") == "Errands"
        and t1.get("category_path") == ["Errands"]
        and "Moved" in toast
    )
    results["DESKTOP_MOVE_CTRL"] = {"status": "PASS" if ok else "FAIL", "summary": s, "t1": t1, "toast": toast}


async def test_repair5_wobble(page):
    await seed_and_load(page, SEED_TWO_PACKS, {"width": 390, "height": 844})
    grip = await get_center(page, "note-tile-grip-a1")
    tile_a4 = await get_center(page, "note-tile-a4")
    if not grip or not tile_a4:
        results["REPAIR5_WOBBLE"] = {"status": "FAIL", "reason": "elements not found"}
        return
    await cdp_touch_drag(page, grip, tile_a4, steps=30, wobble_at=[10, 20])
    await page.wait_for_timeout(700)
    notes = await page.evaluate(READ_JS)
    s = summarize(notes)
    a1 = find(notes, "a1")
    fresh_uuid = [n["id"] for n in notes if len(n["id"]) == 36 and "-" in n["id"]]
    ok = (
        s["total"] == 6
        and a1 and a1.get("pack_id") == "recipes-pack" and a1.get("category") == "recipes"
        and len(fresh_uuid) == 0
    )
    results["REPAIR5_WOBBLE"] = {"status": "PASS" if ok else "FAIL", "summary": s, "a1": a1, "fresh_uuids": fresh_uuid}


async def main():
    console_errors = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(args=["--no-sandbox"])
        ctx = await browser.new_context(has_touch=True)
        page = await ctx.new_page()
        page.on("pageerror", lambda e: console_errors.append(f"pageerror: {e}"))
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
        try:
            await test_8a(page, console_errors)
            if results.get("TEST_8A", {}).get("status") == "PASS":
                await test_8a_reload(page)
            else:
                results["TEST_8A_RELOAD"] = {"status": "SKIPPED", "reason": "8A failed"}
            await test_desktop_copy(page)
            await test_desktop_move_ctrl(page)
            await test_repair5_wobble(page)
        finally:
            results["console_errors"] = console_errors
            await browser.close()
    print(json.dumps(results, indent=2, default=str))


if __name__ == "__main__":
    asyncio.run(main())
