import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const ScrollAnimatedSection = ({
  children,
  delay = 0,
  direction = 'up',
  className = '',
}) => {
  const elementRef = useRef(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    let xVal = 0;
    let yVal = 0;
    const distance = 40;

    if (direction === 'up') yVal = distance;
    else if (direction === 'down') yVal = -distance;
    else if (direction === 'left') xVal = distance;
    else if (direction === 'right') xVal = -distance;

    const anim = gsap.fromTo(
      el,
      {
        opacity: 0,
        x: xVal,
        y: yVal,
      },
      {
        opacity: 1,
        x: 0,
        y: 0,
        duration: 0.8,
        delay: delay,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      }
    );

    return () => {
      anim.kill();
    };
  }, [direction, delay]);

  return (
    <div ref={elementRef} className={className}>
      {children}
    </div>
  );
};
