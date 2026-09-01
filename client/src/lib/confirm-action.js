async function loadAlert() {
  return (await import("sweetalert2")).default;
}

export async function confirmAction({
  title,
  text,
  confirmText = "Confirm",
  icon = "question",
  danger = false,
}) {
  const Swal = await loadAlert();
  const result = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    focusCancel: danger,
    reverseButtons: true,
    confirmButtonText: confirmText,
    cancelButtonText: "Cancel",
    buttonsStyling: false,
    customClass: {
      popup: "campus-swal-popup",
      title: "campus-swal-title",
      htmlContainer: "campus-swal-copy",
      actions: "campus-swal-actions",
      confirmButton: danger ? "campus-swal-danger" : "campus-swal-confirm",
      cancelButton: "campus-swal-cancel",
    },
  });
  return result.isConfirmed;
}

export async function showLoginRequired() {
  const Swal = await loadAlert();
  return Swal.fire({
    title: "Sign in required",
    text: "Please sign in to view full gig details and use CampusCollab features.",
    icon: "info",
    confirmButtonText: "Go to sign in",
    allowEscapeKey: false,
    allowOutsideClick: false,
    buttonsStyling: false,
    customClass: {
      popup: "campus-swal-popup",
      title: "campus-swal-title",
      htmlContainer: "campus-swal-copy",
      confirmButton: "campus-swal-confirm",
    },
  });
}
