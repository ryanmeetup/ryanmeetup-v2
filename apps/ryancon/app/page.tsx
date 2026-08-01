// Components
import { Layout } from "@/components/navigation";
import { Hero, CommunityVoices } from "@/components/home";

const HomePage = () => {
  return (
    <Layout fullscreen>
      <Hero />
      <CommunityVoices />
    </Layout>
  );
};

export default HomePage;
