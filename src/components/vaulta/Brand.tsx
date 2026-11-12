import Link from "next/link";

export function Brand() {
  return <Link className="v-brand" href="/" aria-label="VAULTA home"><span className="v-brand-mark" aria-hidden="true"><i /><i /><i /><i /></span><span>VAULTA</span></Link>;
}
