import { onAuthStateChanged, type User } from "firebase/auth";
import { get, ref, remove, update } from "firebase/database";
import { auth, database } from "./firebase";

type InternshipDetails = {
	id: string;
	title: string;
	company: string;
	location: string;
	category: string;
	duration: string;
	deadline: string;
	skills: string;
	summary: string;
};

const roleSummaries: Record<string, string> = {
	"google-frontend": "Help build responsive web features and improve user interfaces with modern front-end tools.",
	"microsoft-ux": "Support user research and turn insights into clear, accessible product prototypes.",
	"shopify-data": "Analyze product and business data, prepare reports, and share useful findings with a team.",
	"aba-backend": "Assist with server-side features and learn secure backend development practices.",
	"wing-marketing": "Help plan campaign content and review engagement across digital channels.",
	"smart-design": "Create visual assets and interface concepts for digital products and campaigns.",
	"khmer-enterprise-qa": "Test web applications, document issues, and help improve release quality.",
	"pipedrive-product-design": "Explore product flows, build prototypes, and contribute to user-centered design decisions.",
	"cellcard-social-media": "Plan social content, support campaign publishing, and track audience engagement.",
	"grab-mobile-dev": "Help build and test mobile app features using Flutter and Dart.",
	"khmer-bev-data": "Prepare datasets, identify patterns, and communicate findings through reports or dashboards.",
	"bookme-content-marketing": "Write and optimize content, support SEO, and monitor audience engagement.",
	"stripe-software": "Build product features, improve system reliability, and learn how software teams ship applications.",
};

const dialog = document.querySelector<HTMLDialogElement>("#internshipDialog");
const dialogTitle = document.querySelector<HTMLElement>("#internshipDialogTitle");
const dialogCompany = document.querySelector<HTMLElement>("#internshipDialogCompany");
const dialogSummary = document.querySelector<HTMLElement>("#internshipDialogSummary");
const dialogLocation = document.querySelector<HTMLElement>("#internshipDialogLocation");
const dialogCategory = document.querySelector<HTMLElement>("#internshipDialogCategory");
const dialogDuration = document.querySelector<HTMLElement>("#internshipDialogDuration");
const dialogDeadline = document.querySelector<HTMLElement>("#internshipDialogDeadline");
const dialogSkills = document.querySelector<HTMLElement>("#internshipDialogSkills");
const dialogMessage = document.querySelector<HTMLElement>("#internshipDialogMessage");
const researchLink = document.querySelector<HTMLAnchorElement>("#internshipResearchLink");
const loginLink = document.querySelector<HTMLAnchorElement>("#internshipLoginLink");
const profileLink = document.querySelector<HTMLAnchorElement>("#internshipProfileLink");
const detailsApplyButton = document.querySelector<HTMLButtonElement>("#internshipDetailsApply");
const confirmApplicationButton = document.querySelector<HTMLButtonElement>("#internshipConfirmApplication");

let currentUser: User | null = auth.currentUser;
let initialAuthStateLoaded = false;
let resolveInitialAuthState: (user: User | null) => void = () => {};
const initialAuthState = new Promise<User | null>((resolve) => {
	resolveInitialAuthState = resolve;
});

onAuthStateChanged(auth, (user) => {
	currentUser = user;
	if (user) void loadSavedInternships(user);
	if (!initialAuthStateLoaded) {
		initialAuthStateLoaded = true;
		resolveInitialAuthState(user);
	}
});

let selectedInternship: InternshipDetails | null = null;

function readInternshipDetails(button: HTMLButtonElement): InternshipDetails | null {
	const internshipId = button.dataset.internshipId;
	const card = button.closest<HTMLElement>("article") ||
		Array.from(document.querySelectorAll<HTMLElement>("article[data-internship-id]"))
			.find((article) => article.dataset.internshipId === internshipId);
	const id = internshipId || card?.dataset.internshipId;
	if (!card || !id) return null;

	const saveButton = card.querySelector<HTMLButtonElement>("[data-save-internship]");
	const title = button.dataset.internshipTitle || saveButton?.dataset.internshipTitle ||
		card.querySelector<HTMLElement>("h2, h3")?.textContent?.trim() || "Internship";
	const company = button.dataset.internshipCompany || saveButton?.dataset.internshipCompany || "Company not listed";
	const location = card.dataset.locationLabel ||
		card.querySelector<HTMLElement>(".fa-location-dot")?.parentElement?.textContent?.trim() ||
		card.dataset.location?.replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Not listed";
	const category = card.dataset.categoryLabel ||
		card.querySelector<HTMLElement>(".fa-puzzle-piece, .fa-palette")?.parentElement?.textContent?.trim() ||
		card.dataset.category?.split(" ")[0] || "Not listed";
	const skillTags = card.querySelectorAll<HTMLElement>(".flex.flex-wrap.gap-2.mb-4 > span");
	const skills = card.dataset.skillsLabel || Array.from(skillTags, (tag) => tag.textContent?.trim()).filter(Boolean).join(", ") ||
		card.dataset.skills?.split(" ").join(", ") || "Not listed";
	const deadline = card.dataset.deadline ||
		card.querySelector<HTMLElement>(".text-orange-600")?.textContent?.replace(/^Deadline:\s*/, "").trim() || "Not listed";

	return {
		id,
		title,
		company,
		location,
		category,
		duration: card.dataset.duration || "Not listed",
		deadline,
		skills,
		summary: roleSummaries[id] || "Review the employer's official listing for role responsibilities and requirements.",
	};
}

async function showInternshipDialog(internship: InternshipDetails, mode: "details" | "apply") {
	if (!dialog || !dialogTitle || !dialogCompany || !dialogSummary || !dialogLocation || !dialogCategory ||
		!dialogDuration || !dialogDeadline || !dialogSkills || !dialogMessage || !researchLink || !loginLink ||
		!profileLink || !detailsApplyButton || !confirmApplicationButton) return;

	selectedInternship = internship;
	dialogTitle.textContent = mode === "details" ? internship.title : `Apply for ${internship.title}`;
	dialogCompany.textContent = internship.company;
	dialogSummary.textContent = internship.summary;
	dialogLocation.textContent = internship.location;
	dialogCategory.textContent = internship.category;
	dialogDuration.textContent = internship.duration;
	dialogDeadline.textContent = internship.deadline;
	dialogSkills.textContent = internship.skills;
	researchLink.href = `https://www.google.com/search?${new URLSearchParams({
		q: `${internship.company} official careers ${internship.title}`,
	})}`;
	dialogMessage.classList.remove("text-red-600", "text-green-700");
	dialogMessage.classList.add("text-slate-600");
	loginLink.hidden = true;
	profileLink.hidden = true;
	confirmApplicationButton.hidden = true;
	detailsApplyButton.hidden = mode !== "details";

	if (mode === "details") {
		dialogMessage.textContent = "Example listing. Check the employer's official careers page for current openings and requirements.";
	} else {
		dialogMessage.textContent = "This saves the opportunity to your Career Guide profile. It does not submit an application to the employer.";
	}

	if (!dialog.open) dialog.showModal();
	if (mode === "apply") {
		const user = initialAuthStateLoaded ? currentUser : await initialAuthState;
		if (!dialog.open || selectedInternship?.id !== internship.id) return;
		loginLink.hidden = Boolean(user);
		confirmApplicationButton.hidden = !user;
	}
}

document.addEventListener("click", (event) => {
	if (!(event.target instanceof Element)) return;
	const target = event.target;
	const saveButton = target.closest<HTMLButtonElement>("[data-save-internship]");
	if (saveButton) {
		void toggleSavedInternship(saveButton);
		return;
	}
	const closeButton = target.closest<HTMLButtonElement>("[data-close-internship-dialog]");
	if (closeButton) {
		dialog?.close();
		return;
	}
	const viewDetailsButton = target.closest<HTMLButtonElement>("[data-view-details]");
	const applyButton = target.closest<HTMLButtonElement>("[data-apply-internship]");
	const button = viewDetailsButton || applyButton;
	if (!button) return;
	const internship = readInternshipDetails(button);
	if (internship) void showInternshipDialog(internship, viewDetailsButton ? "details" : "apply");
});

async function loadSavedInternships(user: User) {
	try {
		const snapshot = await get(ref(database, `users/${user.uid}/savedInternships`));
		const savedIds = new Set(Object.keys(snapshot.val() ?? {}));
		for (const button of document.querySelectorAll<HTMLButtonElement>("[data-save-internship]")) {
			setSavedButtonState(button, savedIds.has(button.dataset.internshipId ?? ""));
		}
	} catch (error) {
		console.error("Unable to load saved internships:", error);
	}
}

async function toggleSavedInternship(button: HTMLButtonElement) {
	const user = initialAuthStateLoaded ? currentUser : await initialAuthState;
	if (!user) {
		window.location.href = "./login.html";
		return;
	}

	const internship = readInternshipDetails(button);
	if (!internship || button.disabled) return;
	button.disabled = true;

	try {
		const savedReference = ref(database, `users/${user.uid}/savedInternships/${internship.id}`);
		const snapshot = await get(savedReference);
		if (snapshot.exists()) {
			await remove(savedReference);
			setSavedButtonState(button, false);
		} else {
			await update(savedReference, {
				title: internship.title,
				company: internship.company,
			});
			setSavedButtonState(button, true);
		}
	} catch (error) {
		console.error("Unable to save internship:", error);
		alert("Unable to update saved internships. Please try again.");
	} finally {
		button.disabled = false;
	}
}

function setSavedButtonState(button: HTMLButtonElement, saved: boolean) {
	button.setAttribute("aria-pressed", String(saved));
	button.setAttribute("aria-label", saved ? "Remove saved internship" : "Save internship");
	const icon = button.querySelector("i");
	icon?.classList.toggle("fa-solid", saved);
	icon?.classList.toggle("fa-regular", !saved);
	button.classList.toggle("text-red-600", saved);
}

detailsApplyButton?.addEventListener("click", () => {
	if (selectedInternship) void showInternshipDialog(selectedInternship, "apply");
});

confirmApplicationButton?.addEventListener("click", async () => {
	if (!dialogMessage || !confirmApplicationButton || !profileLink || !loginLink) return;
	const internship = selectedInternship;
	if (!internship) return;

	const user = initialAuthStateLoaded ? currentUser : await initialAuthState;
	if (!user) {
		loginLink.hidden = false;
		confirmApplicationButton.hidden = true;
		return;
	}

	confirmApplicationButton.disabled = true;
	try {
		await update(ref(database, `users/${user.uid}/applications/${internship.id}`), {
			title: internship.title,
			company: internship.company,
			appliedAt: new Date().toLocaleDateString(),
			status: "Tracked",
		});
		dialogMessage.classList.remove("text-red-600", "text-slate-600");
		dialogMessage.classList.add("text-green-700");
		dialogMessage.textContent = "Saved to your profile's application tracker. It was not sent to the employer.";
		confirmApplicationButton.hidden = true;
		if (detailsApplyButton) detailsApplyButton.hidden = true;
		profileLink.hidden = false;
	} catch {
		dialogMessage.classList.remove("text-green-700", "text-slate-600");
		dialogMessage.classList.add("text-red-600");
		dialogMessage.textContent = "Unable to save this opportunity. Please check your connection and try again.";
	} finally {
		confirmApplicationButton.disabled = false;
	}
});

dialog?.addEventListener("click", (event) => {
	if (event.target === dialog) dialog.close();
});