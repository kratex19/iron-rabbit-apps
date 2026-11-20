# Iron Rabbit Backup - Quick Download Links
## Backup Date: 2026-11-20 19:19:31 UTC

---

## DOWNLOAD THESE FILES

### 1. Git Bundle (Complete Repository)
**File**: `iron-rabbit-backup-20261120-191931.bundle`  
**Size**: 139 MB  
**Location**: `/app/backups/iron-rabbit-backup-20261120-191931.bundle`  
**SHA-256**: `97a2e20c6c5808542acd01c4d27993eb48787374b545d5eb7253cecb40d9e6d7`

### 2. Documentation & Configuration Archive
**File**: `iron-rabbit-untracked-20261120-191931.zip`  
**Size**: 620 KB  
**Location**: `/app/backups/iron-rabbit-untracked-20261120-191931.zip`  
**SHA-256**: `f757b6fc0c282ecd141ffe8013b84a388fbc1d1a59a79bf98beb6671bcf442b1`

### 3. Backup Inventory (This Document)
**File**: `BACKUP_INVENTORY_20261120-191931.md`  
**Location**: `/app/backups/BACKUP_INVENTORY_20261120-191931.md`

---

## GITHUB BRANCH TO PUSH

**Branch Name**: `backup/iron-rabbit-20261120-191919-complete-state`  
**Action Required**: Click "Save to GitHub" to push this branch to remote repository

---

## QUICK RESTORE

```bash
# 1. Download both files above
# 2. Clone from bundle:
git clone iron-rabbit-backup-20261120-191931.bundle iron-rabbit-restored
cd iron-rabbit-restored

# 3. Extract documentation:
unzip iron-rabbit-untracked-20261120-191931.zip

# 4. Install dependencies:
cd frontend && yarn install
cd ../backend && pip install -r requirements.txt

# 5. Configure secrets in .env files
# 6. Ready to run!
```
