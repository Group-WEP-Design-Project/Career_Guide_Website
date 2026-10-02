import "./style.css";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { get, ref } from "firebase/database";
import { auth, database } from "./firebase";

const menuToggle = document.querySelector<HTMLButtonElement>("#menu-toggle");
const mainNav = document.querySelector<HTMLElement>("#main-nav");
const mobileViewport = window.matchMedia("(max-width: 767px)");

const accountArea = document.querySelector<HTMLElement>("#accountArea");
const accountLoginLink = document.querySelector<HTMLAnchorElement>("#accountLoginLink");
const accountMenuButton = document.querySelector<HTMLButtonElement>("#accountMenuButton");
const accountMenu = document.querySelector<HTMLElement>("#accountMenu");

if (accountArea && accountLoginLink && accountMenuButton && accountMenu) {
	const accountAvatarInitials = document.querySelector<HTMLElement>("#accountAvatarInitials");
	const accountAvatarImage = document.querySelector<HTMLImageElement>("#accountAvatarImage");
	const accountButtonName = document.querySelector<HTMLElement>("#accountButtonName");
	const accountMenuName = document.querySelector<HTMLElement>("#accountMenuName");
	const accountEmail = document.querySelector<HTMLElement>("#accountEmail");
	const accountUniversity = document.querySelector<HTMLElement>("#accountUniversity");
	const accountMajor = document.querySelector<HTMLElement>("#accountMajor");
	const accountActivity = document.querySelector<HTMLElement>("#accountActivity");	
	const homeProfileInitials = document.querySelector<HTMLElement>("#homeProfileInitials");
	const homeProfilePhoto = document.querySelector<HTMLImageElement>("#homeProfilePhoto");
	const homeProfileName = document.querySelector<HTMLElement>("#homeProfileName");
	const homeProfileEducation = document.querySelector<HTMLElement>("#homeProfileEducation");
	const homeProfileAbout = document.querySelector<HTMLElement>("#homeProfileAbout");
	const homeProfileSkillCount = document.querySelector<HTMLElement>("#homeProfileSkillCount");
	const homeProfileSavedCount = document.querySelector<HTMLElement>("#homeProfileSavedCount");
	let profileLoad = 0;

	const setMenuOpen = (open: boolean) => {
		accountMenu.hidden = !open;
		accountMenuButton.setAttribute("aria-expanded", String(open));
	};

	onAuthStateChanged(auth, async (user) => {
		const request = ++profileLoad;
		accountLoginLink.hidden = Boolean(user);
		accountMenuButton.hidden = !user;
		setMenuOpen(false);
		if (!user) return;

		const defaultName = user.displayName || user.email?.split("@")[0] || "Account";
		if (accountButtonName) accountButtonName.textContent = defaultName;
		if (accountMenuName) accountMenuName.textContent = defaultName;
		if (accountEmail) accountEmail.textContent = user.email || "Email not available";

		try {
			const snapshot = await get(ref(database, `users/${user.uid}`));
			if (request !== profileLoad || auth.currentUser?.uid !== user.uid) return;
			const remoteProfile = snapshot.val() as {
				fullName?: string;
				email?: string;
				university?: string;
				major?: string;
				about?: string;
				skills?: string[];
				profilePhoto?: { downloadUrl?: string };
				savedInternships?: Record<string, unknown>;
				applications?: Record<string, unknown>;
			} | null;
			let localProfile: typeof remoteProfile = null;
			try {
				localProfile = JSON.parse(localStorage.getItem(`careerGuideProfile:${user.uid}`) || "null") as typeof remoteProfile;
			} catch {
				localProfile = null;
			}
			const profile = { ...remoteProfile, ...localProfile };
			const name = profile?.fullName || defaultName;
			const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
			if (accountButtonName) accountButtonName.textContent = name;
			if (accountMenuName) accountMenuName.textContent = name;
			if (accountEmail) accountEmail.textContent = profile?.email || user.email || "Email not available";
			if (accountAvatarInitials) accountAvatarInitials.textContent = initials || "U";
			if (accountAvatarImage) {
				const photoUrl = profile?.profilePhoto?.downloadUrl;
				accountAvatarImage.hidden = !photoUrl;
				if (photoUrl) accountAvatarImage.src = photoUrl;
			}
			if (accountUniversity) accountUniversity.textContent = profile?.university || "School not added";
			if (accountMajor) accountMajor.textContent = profile?.major || "Major not added";
			if (homeProfileName) homeProfileName.textContent = name;
			if (homeProfileInitials) homeProfileInitials.textContent = initials || "U";
			if (homeProfilePhoto) {
				homeProfilePhoto.hidden = !profile?.profilePhoto?.downloadUrl;
				if (profile?.profilePhoto?.downloadUrl) homeProfilePhoto.src = profile.profilePhoto.downloadUrl;
			}
			if (homeProfileEducation) {
				homeProfileEducation.textContent = [profile?.major, profile?.university].filter(Boolean).join(" · ") || "Add your school and major";
			}
			if (homeProfileAbout) {
				homeProfileAbout.textContent = profile?.about || "Add a short introduction on your profile to tell employers what you are looking for.";
			}
			if (homeProfileSkillCount) {
				const skillCount = profile?.skills?.length ?? 0;
				homeProfileSkillCount.textContent = `${skillCount} skill${skillCount === 1 ? "" : "s"}`;
			}
			if (homeProfileSavedCount) {
				const savedCount = Object.keys(profile?.savedInternships ?? {}).length;
				homeProfileSavedCount.textContent = `${savedCount} saved internship${savedCount === 1 ? "" : "s"}`;
			}
			if (accountActivity) {
				const savedCount = Object.keys(profile?.savedInternships ?? {}).length;
				const applicationCount = Object.keys(profile?.applications ?? {}).length;
				accountActivity.textContent = `${savedCount} saved internship${savedCount === 1 ? "" : "s"} · ${applicationCount} application${applicationCount === 1 ? "" : "s"}`;
			}
		} catch (error) {
			console.error("Unable to load account information:", error);
		}
	});

	accountMenuButton.addEventListener("click", () => {
		setMenuOpen(Boolean(accountMenu.hidden));
	});
	document.addEventListener("click", (event) => {
		if (!accountArea.contains(event.target as Node)) setMenuOpen(false);
	});
	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape") setMenuOpen(false);
	});
	document.querySelector<HTMLButtonElement>("#accountSignOutButton")?.addEventListener("click", async () => {
		try {
			await signOut(auth);
		} catch (error) {
			console.error("Unable to sign out:", error);
			alert("Unable to sign out right now. Please try again.");
		}
	});
}

if (menuToggle && mainNav) {
	const menuIcon = menuToggle.querySelector("i");
	const setMenuOpen = (isOpen: boolean) => {
		const shouldOpen = mobileViewport.matches && isOpen;
		mainNav.classList.toggle("hidden", !shouldOpen);
		mainNav.classList.toggle("flex", shouldOpen);
		menuToggle.setAttribute("aria-expanded", String(shouldOpen));
		menuToggle.setAttribute("aria-label", shouldOpen ? "Close navigation menu" : "Open navigation menu");
		menuIcon?.classList.toggle("fa-bars", !shouldOpen);
		menuIcon?.classList.toggle("fa-xmark", shouldOpen);
	};

	menuToggle.addEventListener("click", () => {
		setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
	});

	mainNav.querySelectorAll("a").forEach((link) => {
		link.addEventListener("click", () => setMenuOpen(false));
	});

	document.addEventListener("click", (event) => {
		if (
			mobileViewport.matches &&
			menuToggle.getAttribute("aria-expanded") === "true" &&
			!mainNav.contains(event.target as Node) &&
			!menuToggle.contains(event.target as Node)
		) {
			setMenuOpen(false);
		}
	});

	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape") setMenuOpen(false);
	});

	let wasMobile = mobileViewport.matches;
	window.addEventListener("resize", () => {
		const isMobile = mobileViewport.matches;
		if (isMobile !== wasMobile) {
			wasMobile = isMobile;
			setMenuOpen(false);
		}
	});
}

const internshipList = document.querySelector<HTMLElement>("[data-internship-list]");
const internshipListToggle = document.querySelector<HTMLButtonElement>("[data-toggle-internship-list]");

let isInternshipListExpanded = false;

if (internshipList && internshipListToggle) {
	const cards = Array.from(internshipList.querySelectorAll<HTMLElement>("[data-internship-card]"));
	const initialCardCount = 3;
	const label = internshipListToggle.querySelector("span");

	const updateInternshipList = () => {
		cards.forEach((card, index) => {
			const matchesFilters = card.dataset.matchesFilter !== "false";
			card.hidden = !matchesFilters || (!isInternshipListExpanded && index >= initialCardCount);
		});
		internshipListToggle.setAttribute("aria-expanded", String(isInternshipListExpanded));
		if (label) label.textContent = isInternshipListExpanded ? "Show fewer" : `View all (${cards.length})`;
	};

	updateInternshipList();
	internshipListToggle.addEventListener("click", () => {
		isInternshipListExpanded = !isInternshipListExpanded;
		updateInternshipList();
	});
}

const normalizeInternshipText = (value: string | null | undefined) =>
	(value ?? "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

const internshipSearchInput = document.querySelector<HTMLInputElement>("[data-internship-search]");
const internshipFilters = Array.from(document.querySelectorAll<HTMLSelectElement>("[data-internship-filter]"));
const internshipCards = Array.from(document.querySelectorAll<HTMLElement>("[data-internship-card]"));
const internshipResultsCount = document.querySelector<HTMLElement>("#internshipResultsCount");

if (internshipSearchInput || internshipFilters.length || internshipCards.length) {
	const syncInternshipSearch = () => {
		const searchText = normalizeInternshipText(internshipSearchInput?.value ?? "");
		const filterValues = new Map<string, string>();

		internshipFilters.forEach((filter) => {
			const key = filter.dataset.internshipFilter ?? "";
			const value = normalizeInternshipText(filter.value);
			if (key && value && !["location", "category", "type", "skills", "duration"].includes(value)) {
				filterValues.set(key, value);
			}
		});

		let visibleCount = 0;
		internshipCards.forEach((card, index) => {
			const summary = [
				card.dataset.internshipId ?? "",
				card.dataset.location ?? "",
				card.dataset.category ?? "",
				card.dataset.type ?? "",
				card.dataset.skills ?? "",
				card.dataset.duration ?? "",
				card.querySelector("h2, h3")?.textContent ?? "",
				card.querySelector("p")?.textContent ?? "",
				card.textContent ?? "",
			].join(" ");
			const normalizedSummary = normalizeInternshipText(summary);

			const locationPass = !filterValues.get("location") || normalizeInternshipText(card.dataset.location).includes(filterValues.get("location") ?? "");
			const categoryPass = !filterValues.get("category") || normalizeInternshipText(card.dataset.category).includes(filterValues.get("category") ?? "");
			const typePass = !filterValues.get("type") || normalizeInternshipText(card.dataset.type).includes(filterValues.get("type") ?? "");
			const skillPass = !filterValues.get("skills") || normalizeInternshipText(card.dataset.skills).includes(filterValues.get("skills") ?? "");
			const durationPass = !filterValues.get("duration") || normalizeInternshipText(card.dataset.duration).includes(filterValues.get("duration") ?? "");
			const searchPass = !searchText || normalizedSummary.includes(searchText);
			const matches = locationPass && categoryPass && typePass && skillPass && durationPass && searchPass;
			card.dataset.matchesFilter = String(matches);
			const shouldHideByListState = Boolean(internshipList) && !isInternshipListExpanded && index >= 3;
			card.hidden = !matches || shouldHideByListState;
			if (matches) visibleCount += 1;
		});

		if (internshipResultsCount) {
			const label = visibleCount === 1 ? "Internship Opportunity" : "Internship Opportunities";
			internshipResultsCount.textContent = `${visibleCount} ${label}`;
		}
	};

	internshipSearchInput?.addEventListener("input", syncInternshipSearch);
	internshipFilters.forEach((filter) => filter.addEventListener("change", syncInternshipSearch));
	syncInternshipSearch();
}

document.querySelectorAll<HTMLButtonElement>("[data-resource-toggle]").forEach((toggle) => {
	const details = document.getElementById(toggle.dataset.resourceToggle ?? "");
	if (!details) return;

	toggle.addEventListener("click", () => {
		const isExpanded = toggle.getAttribute("aria-expanded") === "true";
		toggle.setAttribute("aria-expanded", String(!isExpanded));
		toggle.textContent = isExpanded ? "Read More" : "Show Less";
		details.hidden = isExpanded;
	});
});

const careerProfiles = {
	"web-developer": {
		title: "Web Developer",
		category: "Technology career",
		summary: "Build modern, responsive websites and applications that deliver great user experiences.",
		overview: "Web developers design and build websites, from layout and styling to front-end logic and back-end integration. They often work in teams to deliver digital products for businesses, organizations, and communities.",
		duties: ["Develop user interfaces and interactive page elements.", "Collaborate with designers and developers to ship features.", "Test and optimize websites for responsiveness and performance."],
		requiredSkills: ["HTML", "CSS", "JavaScript", "React", "Git"],
		technicalSkills: ["Responsive design principles", "Frontend frameworks like React", "Version control and debugging"],
		softSkills: ["Problem-solving", "Communication", "Teamwork and adaptability"],
		level: "Entry-level",
		growth: "High",
		focus: "Frontend, UI, UX",
	},
	"ui-ux-designer": {
		title: "UI/UX Designer",
		category: "Design career",
		summary: "Design intuitive digital experiences through research, prototyping, and visual design.",
		overview: "UI/UX designers research what people need, then shape clear and accessible digital products. They create user flows, wireframes, and prototypes, and work with product and engineering teams to improve the experience.",
		duties: ["Interview users and turn findings into product requirements.", "Create wireframes, prototypes, and polished interface designs.", "Test designs and refine them using user feedback."],
		requiredSkills: ["Figma", "Prototyping", "User research", "Accessibility", "Usability testing"],
		technicalSkills: ["Wireframing and prototyping", "Design systems", "Interaction design"],
		softSkills: ["Empathy", "Communication", "Collaboration"],
		level: "Entry-level",
		growth: "High",
		focus: "Research, interaction, visual design",
	},
	"mobile-developer": {
		title: "Mobile Developer",
		category: "Technology career",
		summary: "Create apps for Android and iOS with a strong focus on usability and performance.",
		overview: "Mobile developers build and maintain applications for phones and tablets. They work with platform-specific or cross-platform tools, connect apps to services, and test across devices to deliver reliable experiences.",
		duties: ["Build and maintain features for mobile applications.", "Connect apps to APIs and backend services.", "Test app behavior, accessibility, and performance across devices."],
		requiredSkills: ["Kotlin or Swift", "Flutter or React Native", "REST APIs", "Git", "Testing"],
		technicalSkills: ["Native or cross-platform development", "Mobile interface patterns", "App performance optimization"],
		softSkills: ["Problem-solving", "Attention to detail", "Teamwork"],
		level: "Entry-level",
		growth: "High",
		focus: "Android, iOS, mobile apps",
	},
	"data-analyst": {
		title: "Data Analyst",
		category: "Data career",
		summary: "Turn raw data into actionable insights that help teams make better decisions.",
		overview: "Data analysts collect, clean, and examine information to answer business questions. They use queries, statistics, and visualizations to explain trends and help teams choose what to do next.",
		duties: ["Gather and clean data from reliable sources.", "Analyze trends and answer stakeholder questions.", "Build reports and dashboards that communicate findings."],
		requiredSkills: ["SQL", "Excel", "Python", "Statistics", "Tableau or Power BI"],
		technicalSkills: ["Data cleaning and querying", "Statistical analysis", "Dashboard and report creation"],
		softSkills: ["Critical thinking", "Clear communication", "Attention to detail"],
		level: "Entry-level",
		growth: "High",
		focus: "Analysis, reporting, visualization",
	},
	"digital-marketer": {
		title: "Digital Marketer",
		category: "Marketing career",
		summary: "Drive online engagement through content, ads, and analytics-driven campaigns.",
		overview: "Digital marketers plan and improve campaigns across search, social media, email, and other online channels. They connect audience needs with useful content, then measure results to improve reach and conversions.",
		duties: ["Plan content and campaigns for digital channels.", "Manage search, social, email, or paid advertising activity.", "Review campaign analytics and recommend improvements."],
		requiredSkills: ["SEO", "Content marketing", "Web analytics", "Copywriting", "Social media"],
		technicalSkills: ["Campaign management tools", "Analytics and reporting", "Search and social platforms"],
		softSkills: ["Creativity", "Communication", "Adaptability"],
		level: "Entry-level",
		growth: "High",
		focus: "Content, campaigns, analytics",
	},
	"graphic-designer": {
		title: "Graphic Designer",
		category: "Design career",
		summary: "Design visual identity, campaigns, and creative assets for brands and businesses.",
		overview: "Graphic designers communicate ideas visually across digital and print formats. They develop layouts, illustrations, and brand assets while balancing a client's goals with audience needs and production requirements.",
		duties: ["Create graphics and layouts for digital or print use.", "Develop visual assets that follow brand guidelines.", "Prepare files for publication and incorporate feedback."],
		requiredSkills: ["Typography", "Layout", "Adobe Illustrator", "Adobe Photoshop", "Branding"],
		technicalSkills: ["Vector and image editing", "Color and composition", "Print and digital file preparation"],
		softSkills: ["Creativity", "Attention to detail", "Receiving feedback"],
		level: "Entry-level",
		growth: "Good",
		focus: "Branding, layout, visual communication",
	},
} as const;

const careerDetails = document.querySelector<HTMLElement>("#career-details");
if (careerDetails) {
	const selectedCareer = new URLSearchParams(window.location.search).get("career") as keyof typeof careerProfiles | null;
	const profile = selectedCareer ? careerProfiles[selectedCareer] : careerProfiles["web-developer"];
	if (profile) {
		const setText = (selector: string, text: string) => {
			const element = careerDetails.querySelector<HTMLElement>(selector);
			if (element) element.textContent = text;
		};
		const setList = (selector: string, items: readonly string[], iconClass: string) => {
			const list = careerDetails.querySelector<HTMLElement>(selector);
			if (!list) return;
			list.replaceChildren(...items.map((item) => {
				const row = document.createElement("li");
				row.className = "flex items-start gap-3";
				const icon = document.createElement("i");
				icon.className = `${iconClass} mt-1 shrink-0 text-green-600`;
				icon.setAttribute("aria-hidden", "true");
				const text = document.createElement("span");
				text.textContent = item;
				row.append(icon, text);
				return row;
			}));
		};

		setText("#career-title", profile.title);
		setText("#career-category", profile.category);
		setText("#career-summary", profile.summary);
		setText("#career-overview", profile.overview);
		setText("#career-level", profile.level);
		setText("#career-growth", profile.growth);
		setText("#career-focus", profile.focus);
		setList("#career-duties", profile.duties, "fa-solid fa-check");
		setList("#career-technical-skills", profile.technicalSkills, "fa-solid fa-check");
		setList("#career-soft-skills", profile.softSkills, "fa-solid fa-check");

		const requiredSkills = careerDetails.querySelector<HTMLElement>("#career-required-skills");
		if (requiredSkills) {
			requiredSkills.replaceChildren(...profile.requiredSkills.map((skill) => {
				const tag = document.createElement("span");
				tag.className = "inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs text-slate-600";
				tag.textContent = skill;
				return tag;
			}));
		}
		document.title = `${profile.title} | Career Guide`;
	}
}