import RockyBlog from "@/components/RockyBlog";
import Link from "next/link";

const hairBlog = [
  {
    videoSrc:
      "https://myrocky.b-cdn.net/WP%20Images/Hair%20Loss/hair-video.mp4",
    title: "Simple. Discreet. Affordable.",
    buttonText: "Get Started →",
    buttonLink: "/quiz/hair-pre-consultation-quiz/",
  },
];

const HairBlog = () => {
  return <RockyBlog blog={hairBlog} />;
};

export default HairBlog;
