/* Applies the saved color theme before the page paints. */
(function () {
  try {
    var theme = localStorage.getItem("rw_theme");
    if (theme === "dark" || theme === "light") {
      document.documentElement.setAttribute("data-theme", theme);
    }
  } catch (error) {
    /* Private browsing can block storage; the default theme still works. */
  }
})();
