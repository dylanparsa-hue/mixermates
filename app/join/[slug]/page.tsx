import { CustomerBooking } from '@/components/customer-booking';
import { customerTestEnabled } from '@/lib/customer-policy';
import { redirect } from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{slug:string}>}){if(!customerTestEnabled())redirect('/explore');return <CustomerBooking slug={(await params).slug}/>;}
