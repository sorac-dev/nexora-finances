"use client";

import Link from "next/link";

interface FabProps {
  href: string;
  onClick?: () => void;
}

export function Fab({ href, onClick }: FabProps) {
  return (
    <Link href={href} className="fab" onClick={onClick}>
      +
    </Link>
  );
}
