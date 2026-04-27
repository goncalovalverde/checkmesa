"use client";
import { useState } from "react";

interface Props {
  total: number;
  defaultPeople: number;
}

export function SplitByPerson({ total, defaultPeople }: Props) {
  const [people, setPeople] = useState(String(defaultPeople || 2));
  const n = Math.max(1, parseInt(people, 10) || 1);
  const perPerson = total / n;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <h3 className="font-semibold text-gray-900">Dividir por pessoas</h3>
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600 flex-shrink-0">Nº de pessoas:</label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={people}
          onChange={(e) => setPeople(e.target.value)}
          className="w-20 min-h-[52px] px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-center text-lg font-semibold"
        />
      </div>
      <div className="bg-teal-50 rounded-lg p-3 text-center">
        <p className="text-teal-700 font-bold text-2xl">€{perPerson.toFixed(2)}</p>
        <p className="text-teal-600 text-sm">por pessoa</p>
      </div>
    </div>
  );
}
