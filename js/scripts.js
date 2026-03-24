console.log("OK");
const btn = document.querySelector(".add-btn");
const submenu = document.querySelector(".add-menu");

btn.addEventListener("click", () => {
  submenu.classList.toggle("active");
});