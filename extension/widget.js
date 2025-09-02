function getParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

const ca = getParam('token');
if (ca) {
  const iframe = document.getElementById('swapFrame');
  iframe.src = `https://jupiter-io-web.vercel.app/?CA=${encodeURIComponent(ca)}`;
}

//spinner
window.addEventListener("DOMContentLoaded", () => {
  const iframe = document.getElementById("swapFrame");
  const loader = document.getElementById("custom-loader");

  iframe.onload = function () {
    loader.style.display = "none";
  };
});