interface WaterUIProps {
  onReset?: () => void;
}

export function WaterUI({ onReset }: WaterUIProps) {
  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      {/* Title */}
      <div className="absolute top-6 left-6 md:top-8 md:left-8">
        <h1 className="text-2xl md:text-3xl font-light tracking-wide text-gradient-water">
          WebGL Water
        </h1>
        <p className="text-sm text-muted-foreground mt-1 opacity-70">
          React Three Fiber Port
        </p>
      </div>
      
      {/* Instructions */}
      <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8 max-w-xs">
        <div className="bg-card/40 backdrop-blur-md rounded-lg p-4 border border-border/30">
          <h3 className="text-sm font-medium text-foreground/90 mb-2">Controls</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li className="flex items-center gap-2">
              <span className="w-20 text-primary/80">Click Water</span>
              <span>Add ripples</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-20 text-primary/80">Drag Sphere</span>
              <span>Move the ball</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-20 text-primary/80">Orbit</span>
              <span>Right-drag to rotate</span>
            </li>
          </ul>
        </div>
      </div>
      
      {/* Credits */}
      <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8">
        <p className="text-xs text-muted-foreground/50">
          Original by{' '}
          <a 
            href="http://madebyevan.com/webgl-water/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary/60 hover:text-primary transition-colors pointer-events-auto"
          >
            Evan Wallace
          </a>
        </p>
      </div>
    </div>
  );
}
