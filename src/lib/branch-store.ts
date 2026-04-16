// ─────────────────────────────────────────────────
// Multi-Branch System for Enterprise
// ─────────────────────────────────────────────────

export interface Branch {
	branchId: string;
	branchName: string;
	location: string;
	manager: string;
	createdAt: string;
}

const BRANCHES_KEY = "billingo_branches";
const ACTIVE_BRANCH_KEY = "billingo_active_branch";

// ── CRUD Operations ──

export function getBranches(): Branch[] {
	try {
		const raw = localStorage.getItem(BRANCHES_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

export function getBranchById(branchId: string): Branch | undefined {
	return getBranches().find((b) => b.branchId === branchId);
}

export function saveBranch(data: Omit<Branch, "branchId" | "createdAt">): Branch {
	const branches = getBranches();
	const branch: Branch = {
		...data,
		branchId: `br-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		createdAt: new Date().toISOString(),
	};
	branches.push(branch);
	localStorage.setItem(BRANCHES_KEY, JSON.stringify(branches));
	return branch;
}

export function updateBranch(branchId: string, updates: Partial<Omit<Branch, "branchId" | "createdAt">>): void {
	const branches = getBranches();
	const idx = branches.findIndex((b) => b.branchId === branchId);
	if (idx !== -1) {
		branches[idx] = { ...branches[idx], ...updates };
		localStorage.setItem(BRANCHES_KEY, JSON.stringify(branches));
	}
}

export function deleteBranch(branchId: string): void {
	const branches = getBranches().filter((b) => b.branchId !== branchId);
	localStorage.setItem(BRANCHES_KEY, JSON.stringify(branches));
	// Clear active branch if it was the deleted one
	if (getActiveBranchId() === branchId) {
		setActiveBranchId(null);
	}
}

// ── Active Branch ──

export function getActiveBranchId(): string | null {
	return localStorage.getItem(ACTIVE_BRANCH_KEY);
}

export function setActiveBranchId(branchId: string | null): void {
	if (branchId) {
		localStorage.setItem(ACTIVE_BRANCH_KEY, branchId);
	} else {
		localStorage.removeItem(ACTIVE_BRANCH_KEY);
	}
}

export function getActiveBranch(): Branch | null {
	const id = getActiveBranchId();
	if (!id) return null;
	return getBranchById(id) || null;
}
