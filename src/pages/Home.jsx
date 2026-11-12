import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AboutSection } from '../components/AboutSection';
import { FAQSection } from '../components/FAQSection';
import { FeaturesSection } from '../components/FeaturesSection';
import { Footer } from '../components/Footer';
import { HeroSection } from '../components/HeroSection';
import { useAuth } from '../store/authStore';

/**
 * Twenty ambient nodes across five chromatic families.
 *
 * Positions are percentages of the hero card so the field scales with the
 * layout. Each node owns its motion speed, delay, size, and glow; the CSS
 * keyframes only animate transform/opacity for compositor-friendly motion.
 */
const CELEBRATION_NODES = [
  // Warm golds / ambers
  {
    id: 'gold-1',
    left: 8,
    top: 14,
    size: 18,
    color: '#F4C95D',
    glow: 26,
    delay: 0,
    duration: 15,
    motion: 'slow',
  },
  {
    id: 'gold-2',
    left: 15,
    top: 70,
    size: 12,
    color: '#F2A65A',
    glow: 20,
    delay: 1.2,
    duration: 12,
    motion: 'medium',
  },
  {
    id: 'gold-3',
    left: 88,
    top: 28,
    size: 8,
    color: '#FFD36E',
    glow: 16,
    delay: 0.6,
    duration: 8,
    motion: 'fast',
  },
  {
    id: 'gold-4',
    left: 78,
    top: 82,
    size: 14,
    color: '#E8B04B',
    glow: 22,
    delay: 2.4,
    duration: 16,
    motion: 'slow',
  },

  // Festive magentas / pinks
  {
    id: 'magenta-1',
    left: 72,
    top: 22,
    size: 16,
    color: '#F472B6',
    glow: 24,
    delay: 0.4,
    duration: 11,
    motion: 'medium',
  },
  {
    id: 'magenta-2',
    left: 92,
    top: 58,
    size: 10,
    color: '#EC4899',
    glow: 18,
    delay: 1.8,
    duration: 9,
    motion: 'fast',
  },
  {
    id: 'magenta-3',
    left: 42,
    top: 78,
    size: 20,
    color: '#FB7185',
    glow: 30,
    delay: 3.1,
    duration: 17,
    motion: 'slow',
  },
  {
    id: 'magenta-4',
    left: 6,
    top: 46,
    size: 7,
    color: '#F9A8D4',
    glow: 14,
    delay: 2.2,
    duration: 13,
    motion: 'medium',
  },

  // Royal blues / cyans
  {
    id: 'blue-1',
    left: 46,
    top: 10,
    size: 14,
    color: '#38BDF8',
    glow: 22,
    delay: 0.9,
    duration: 15,
    motion: 'slow',
  },
  {
    id: 'blue-2',
    left: 24,
    top: 62,
    size: 9,
    color: '#2563EB',
    glow: 16,
    delay: 1.4,
    duration: 8,
    motion: 'fast',
  },
  {
    id: 'blue-3',
    left: 84,
    top: 40,
    size: 18,
    color: '#22D3EE',
    glow: 28,
    delay: 2.8,
    duration: 12,
    motion: 'medium',
  },
  {
    id: 'blue-4',
    left: 60,
    top: 88,
    size: 6,
    color: '#60A5FA',
    glow: 12,
    delay: 0.2,
    duration: 7,
    motion: 'fast',
  },

  // Vibrant emeralds / sages
  {
    id: 'emerald-1',
    left: 34,
    top: 34,
    size: 15,
    color: '#34D399',
    glow: 24,
    delay: 1.1,
    duration: 16,
    motion: 'slow',
  },
  {
    id: 'emerald-2',
    left: 8,
    top: 72,
    size: 8,
    color: '#10B981',
    glow: 14,
    delay: 2.6,
    duration: 10,
    motion: 'medium',
  },
  {
    id: 'emerald-3',
    left: 92,
    top: 16,
    size: 12,
    color: '#6EE7B7',
    glow: 20,
    delay: 0.75,
    duration: 9,
    motion: 'fast',
  },
  {
    id: 'emerald-4',
    left: 64,
    top: 54,
    size: 5,
    color: '#A7F3D0',
    glow: 10,
    delay: 3.4,
    duration: 18,
    motion: 'slow',
  },

  // Micro accent sparkles
  {
    id: 'sparkle-1',
    left: 58,
    top: 8,
    size: 4,
    color: '#FDE68A',
    glow: 9,
    delay: 1.6,
    duration: 6.5,
    motion: 'fast',
    kind: 'sparkle',
  },
  {
    id: 'sparkle-2',
    left: 48,
    top: 44,
    size: 4,
    color: '#FBCFE8',
    glow: 9,
    delay: 0.3,
    duration: 8,
    motion: 'medium',
    kind: 'sparkle',
  },
  {
    id: 'sparkle-3',
    left: 76,
    top: 66,
    size: 3,
    color: '#BAE6FD',
    glow: 8,
    delay: 2,
    duration: 7,
    motion: 'fast',
    kind: 'sparkle',
  },
  {
    id: 'sparkle-4',
    left: 28,
    top: 90,
    size: 3,
    color: '#D9F99D',
    glow: 8,
    delay: 3.8,
    duration: 19,
    motion: 'slow',
    kind: 'sparkle',
  },
];

function CelebrationBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 20% 20%, rgba(244, 201, 93, 0.12), transparent 45%), radial-gradient(circle at 80% 30%, rgba(56, 189, 248, 0.12), transparent 45%), radial-gradient(circle at 50% 82%, rgba(244, 114, 182, 0.1), transparent 50%)',
        }}
      />

      {CELEBRATION_NODES.map(node => (
        <span
          key={node.id}
          className={[
            'celebrate-node',
            `celebrate-float-${node.motion}`,
            node.kind === 'sparkle' ? 'celebrate-sparkle' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{
            left: `${node.left}%`,
            top: `${node.top}%`,
            width: `${node.size}px`,
            height: `${node.size}px`,
            backgroundColor: node.color,
            boxShadow: `0 0 ${node.glow}px ${node.color}`,
            animationDelay: `${node.delay}s`,
            animationDuration: `${node.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

function Home() {
  const { user, profiledata } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && profiledata) {
      // Redirect admin users to admin panel, others to search
      if (profiledata.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/myspace');
      }
    }
  }, [user, profiledata, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="relative z-10 flex-1">
        <HeroSection celebration={<CelebrationBackdrop />} />

        <div className="relative z-10">
          <FeaturesSection />
          <AboutSection />
          <FAQSection />
        </div>
      </main>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}

export default Home;
