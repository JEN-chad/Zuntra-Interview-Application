// app/(pages)/dashboard/create-interview/_components/BookingModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BookingModal({ hold, slot, onClose }: any) {
  const router = useRouter(); // ✅ FIXED
  const [countdown, setCountdown] = useState<number>(0);

  useEffect(() => {
    const expiry = new Date(hold.expiresAt).getTime();

    function tick() {
      const ms = expiry - Date.now();
      setCountdown(Math.max(0, Math.ceil(ms / 1000)));
    }

    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [hold]);

  async function confirm() {
    const res = await fetch("/api/bookings/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ holdId: hold.id }),
    });

    const data = await res.json(); // ✅ FIXED

    if (!res.ok) {
      alert(data.error || "Confirm failed");
      return;
    }

    // Booking confirmed
    router.push(data.scheduledUrl); // ✅ FIXED
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
        <h4 className="text-lg font-semibold mb-2">Confirm booking</h4>

        <p className="mb-2">
          Slot: {new Date(slot.start).toLocaleString()} —{" "}
          {new Date(slot.end).toLocaleTimeString()}
        </p>

        <p className="mb-4">
          Hold expires in:{" "}
          {Math.floor(countdown / 60)}:
          {String(countdown % 60).padStart(2, "0")}
        </p>

        <div className="flex gap-2">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={confirm}
          >
            Confirm
          </button>

          <button className="px-4 py-2 border rounded" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
