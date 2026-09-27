import "./style.css";

const menuToggle = document.querySelector<HTMLButtonElement>("#menu-toggle");
const mainNav = document.querySelector<HTMLElement>("#main-nav");
const mobileViewport = window.matchMedia("(max-width: 767px)");

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