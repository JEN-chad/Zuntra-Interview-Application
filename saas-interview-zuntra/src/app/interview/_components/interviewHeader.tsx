import Image from 'next/image';

const InterviewHeader = () =>{
   return (
    <div className="p-4 shadow-sm">
      <Image 
  src="/logo.png" 
  width={200} 
  height={100} 
  alt="Logo"
  className="w-[120px]"
/>

    </div>
   )
}
export default InterviewHeader;