import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import Footer from "@/components/landing/Footer";

const LandingPage = () => {
  return (
    <div className="app-shell min-h-screen bg-[var(--bg-primary)]">
      <Header />
      <Hero />
      <Footer />
    </div>
  );
};

export default LandingPage;
