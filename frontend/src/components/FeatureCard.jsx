
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";

export default function FeatureCard({
  icon: Icon,
  title,
  description,
  onClick,
  accent = "#93c5fd",
}) {
  return (
    <motion.button
      type="button"
      className="feature-card"
      onClick={onClick}
      whileHover={{ y: -5, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className="feature-icon"
        style={{ color: accent }}
      >
        <Icon size={28} />
      </div>

      <h3>{title}</h3>
      <p>{description}</p>

      <span className="feature-link">
        Explore <ArrowUpRight size={17} />
      </span>
    </motion.button>
  );
}
