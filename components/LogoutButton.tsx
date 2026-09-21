"use client";

export default function LogoutButton() {
  async function out() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }
  return (
    <button onClick={out} className="btn btn-outline btn-sm">
      خروج
    </button>
  );
}
