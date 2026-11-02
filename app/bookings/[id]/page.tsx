import { CustomerBooking } from '@/components/customer-booking';
import { customerTestEnabled } from '@/lib/customer-policy';
import { redirect } from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{id:string}>}){if(!customerTestEnabled())redirect('/coming-soon');return <CustomerBooking bookingId={(await params).id}/>;}
