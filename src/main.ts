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

if (internshipList && internshipListToggle) {
	const cards = Array.from(internshipList.querySelectorAll<HTMLElement>("[data-internship-card]"));
	const initialCardCount = 3;
	const label = internshipListToggle.querySelector("span");
	let isExpanded = false;

	const updateInternshipList = () => {
		cards.forEach((card, index) => {
			card.hidden = !isExpanded && index >= initialCardCount;
		});
		internshipListToggle.setAttribute("aria-expanded", String(isExpanded));
		if (label) label.textContent = isExpanded ? "Show fewer" : `View all (${cards.length})`;
	};

	updateInternshipList();
	internshipListToggle.addEventListener("click", () => {
		isExpanded = !isExpanded;
		updateInternshipList();
	});
}