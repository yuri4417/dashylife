console.log("OK");
const btn = document.querySelector(".add-btn");
const submenu = document.querySelector(".submenu");

btn.addEventListener("click", () => {
  submenu.classList.toggle("active");
});