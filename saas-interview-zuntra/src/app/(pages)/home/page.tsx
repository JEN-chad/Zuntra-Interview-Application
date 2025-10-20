import { SignOutButton } from "@/components/auth/signout-button";
import { getSession } from "@/lib/auth";
import {redirect} from "next/navigation";


const Home = async () => {
  const session = await getSession();
  if(!session) redirect("/login")
  return (
    <div>
      Home
      <SignOutButton />
    </div>
  );
};

export default Home;
