import { MotionValue, motion, useSpring, useTransform } from "framer-motion";
import { useEffect, useState, type CSSProperties } from "react";

interface NumberProps {
  mv: MotionValue<number>;
  number: number;
  height: number;
}

function Number({ mv, number, height }: NumberProps) {
  let y = useTransform(mv, (latest) => {
    let placeValue = latest % 10;
    let offset = (10 + number - placeValue) % 10;
    let memo = offset * height;
    if (offset > 5) {
      memo -= 10 * height;
    }
    return memo;
  });

  const style: CSSProperties = {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return <motion.span style={{ ...style, y }}>{number}</motion.span>;
}

interface DigitProps {
  place: number;
  value: number;
  height: number;
  digitStyle?: CSSProperties;
}

function Digit({ place, value, height, digitStyle }: DigitProps) {
  let valueRoundedToPlace = Math.floor(value / place);
  let animatedValue = useSpring(valueRoundedToPlace);

  useEffect(() => {
    animatedValue.set(valueRoundedToPlace);
  }, [animatedValue, valueRoundedToPlace]);

  const defaultStyle: CSSProperties = {
    height,
    position: "relative",
    width: "1ch",
    fontVariantNumeric: "tabular-nums",
  };

  return (
    <div style={{ ...defaultStyle, ...digitStyle }}>
      {Array.from({ length: 10 }, (_, i) => (
        <Number key={i} mv={animatedValue} number={i} height={height} />
      ))}
    </div>
  );
}

interface CounterDisplayProps {
  value: number;
  fontSize?: number;
  padding?: number;
  places?: number[];
  gap?: number;
  borderRadius?: number;
  horizontalPadding?: number;
  textColor?: string;
  fontWeight?: CSSProperties["fontWeight"];
  containerStyle?: CSSProperties;
  counterStyle?: CSSProperties;
  digitStyle?: CSSProperties;
  gradientHeight?: number;
  gradientFrom?: string;
  gradientTo?: string;
  topGradientStyle?: CSSProperties;
  bottomGradientStyle?: CSSProperties;
}

const CounterDisplay = ({
  value,
  fontSize = 100,
  padding = 0,
  places = [100, 10, 1],
  gap = 8,
  borderRadius = 4,
  horizontalPadding = 8,
  textColor = "white",
  fontWeight = "bold",
  containerStyle,
  counterStyle,
  digitStyle,
  gradientHeight = 16,
  gradientFrom = "black",
  gradientTo = "transparent",
  topGradientStyle,
  bottomGradientStyle,
}: CounterDisplayProps) => {
  const height = fontSize + padding;

  const defaultContainerStyle: CSSProperties = {
    position: "relative",
    display: "inline-block",
  };

  const defaultCounterStyle: CSSProperties = {
    fontSize,
    display: "flex",
    gap: gap,
    overflow: "hidden",
    borderRadius: borderRadius,
    paddingLeft: horizontalPadding,
    paddingRight: horizontalPadding,
    lineHeight: 1,
    color: textColor,
    fontWeight: fontWeight,
    backgroundColor: gradientFrom, // Use gradientFrom as background color for consistent gradients
  };

  const gradientContainerStyle: CSSProperties = {
    pointerEvents: "none",
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  };

  const defaultTopGradientStyle: CSSProperties = {
    height: gradientHeight,
    background: `linear-gradient(to bottom, ${gradientFrom}, ${gradientTo})`,
  };

  const defaultBottomGradientStyle: CSSProperties = {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: gradientHeight,
    background: `linear-gradient(to top, ${gradientFrom}, ${gradientTo})`,
  };

  return (
    <div style={{ ...defaultContainerStyle, ...containerStyle }}>
      <div style={{ ...defaultCounterStyle, ...counterStyle }}>
        {places.map((place) => (
          <Digit
            key={place}
            place={place}
            value={value}
            height={height}
            digitStyle={digitStyle}
          />
        ))}
      </div>
      <div style={gradientContainerStyle}>
        <div
          style={topGradientStyle ? topGradientStyle : defaultTopGradientStyle}
        />
        <div
          style={
            bottomGradientStyle
              ? bottomGradientStyle
              : defaultBottomGradientStyle
          }
        />
      </div>
    </div>
  );
};

interface ComponentPropsWithControls extends Omit<CounterDisplayProps, 'value'> {
  value: number;
  onValueChange: (newValue: number) => void;
  min?: number;
  max?: number;
  step?: number;
  // Removed initialValue as it's now a controlled component
  className?: string; // Allow passing className for styling container
}

export const Counter = ({ // Renamed Component to Counter
  value,
  onValueChange,
  className,
  min = 0,
  max = Infinity,
  step = 1,
  fontSize = 100, // Default fontSize from CounterDisplayProps
  padding = 0,    // Default padding from CounterDisplayProps
  places: defaultPlaces = [100, 10, 1], // Default places from CounterDisplayProps
  gap = 8,        // Default gap from CounterDisplayProps
  borderRadius = 4, // Default borderRadius from CounterDisplayProps
  horizontalPadding = 8, // Default horizontalPadding from CounterDisplayProps
  textColor: defaultTextColor = "white", // Default textColor from CounterDisplayProps
  fontWeight = "bold", // Default fontWeight from CounterDisplayProps
  gradientFrom: defaultGradientFrom = "black", // Default gradientFrom from CounterDisplayProps
  gradientHeight = 16, // Default gradientHeight from CounterDisplayProps
  ...rest // Keep other CounterDisplayProps if any
}: ComponentPropsWithControls) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(value));
  const [theme, setTheme] = useState<'light' | 'dark'>('dark'); // Default to dark theme

  useEffect(() => {
    // Update inputValue if the external value prop changes and not editing
    if (!isEditing) {
      setInputValue(String(value));
    }
  }, [value, isEditing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTextValue = e.target.value;
    // Allow only digits or empty string for clearing
    if (/^\d*$/.test(newTextValue)) {
      setInputValue(newTextValue);
    }
  };

  const commitValue = () => {
    let numericValue = parseInt(inputValue, 10);
    if (isNaN(numericValue)) {
      numericValue = min; // Default to min if input is invalid
    }
    // Clamp value between min and max
    numericValue = Math.max(min, Math.min(numericValue, max));
    onValueChange(numericValue);
    setIsEditing(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commitValue();
    } else if (e.key === "Escape") {
      setInputValue(String(value)); // Revert to original value
      setIsEditing(false);
    }
  };

  const handleDisplayClick = () => {
    setInputValue(String(value)); // Initialize input with current value
    setIsEditing(true);
  };
  
  const increment = () => {
    const newValue = Math.min(value + step, max);
    onValueChange(newValue);
  };

  const decrement = () => {
    const newValue = Math.max(value - step, min);
    onValueChange(newValue);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const getButtonColors = (currentTheme: 'light' | 'dark') => {
    if (currentTheme === 'dark') {
      return {
        backgroundColor: 'rgb(28, 28, 30)',
        color: 'white',
        borderColor: 'rgb(58, 58, 60)',
      };
    } else {
      return {
        backgroundColor: 'rgb(227, 227, 229)', // Light grey for light theme button background
        color: 'black',
        borderColor: 'rgb(179, 179, 181)', // Darker light grey for light theme button border
      };
    }
  };

  const buttonColors = getButtonColors(theme);

  const buttonStyle: CSSProperties = {
    padding: '0',
    fontSize: '1rem',
    cursor: 'pointer',
    borderRadius: '12px',
    width: '44px',
    height: '44px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    ...buttonColors,
    border: `1px solid ${buttonColors.borderColor}`,
  };

  const controlsContainerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    flexDirection: 'column',
  };

  const buttonRowStyle: CSSProperties = {
    display: 'flex',
    gap: '10px',
  };

  const themeToggleButtonStyle: CSSProperties = {
    ...buttonStyle,
    marginTop: '20px',
    minWidth: 'unset',
    width: '120px',
  };

  const counterTextColor = theme === 'dark' ? defaultTextColor : 'black'; // Use prop or default
  const counterGradientFrom = theme === 'dark' ? defaultGradientFrom : 'white'; // Use prop or default

  const inputStyle: CSSProperties = {
    // Reconstruct styles using available props/defaults
    fontSize,
    display: 'flex', // Added for consistency with CounterDisplay's defaultCounterStyle
    gap: gap,       // Added for consistency
    overflow: 'hidden', // Added for consistency
    paddingLeft: horizontalPadding,
    paddingRight: horizontalPadding,
    lineHeight: 1,
    color: counterTextColor,
    fontWeight: fontWeight,
    backgroundColor: counterGradientFrom,
    border: `1px solid ${buttonColors.borderColor}`, // Match button border
    borderRadius: borderRadius,
    width: `${String(value).length + 2}ch`, // Approximate width based on number of digits + padding
    minWidth: '3ch', // Minimum width
    textAlign: 'center',
    boxSizing: 'border-box',
    height: fontSize + padding + 2, // Match CounterDisplay height + border
  };
  
  // Determine places based on the current value if not editing, or input value if editing
  const currentValueForPlaces = isEditing ? (parseInt(inputValue,10) || 0) : value;
  const numDigits = String(currentValueForPlaces).length;
  const dynamicPlaces = Array.from({ length: numDigits }, (_, i) => Math.pow(10, numDigits - 1 - i));


  return (
    <div style={controlsContainerStyle} className={className}>
      {isEditing ? (
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={commitValue}
          autoFocus
          style={inputStyle}
        />
      ) : (
        <div onClick={handleDisplayClick} style={{ cursor: 'pointer' }}>
          <CounterDisplay
            value={value}
            textColor={counterTextColor}
            gradientFrom={counterGradientFrom}
            borderRadius={borderRadius}
            horizontalPadding={horizontalPadding}
            gap={gap}
            fontSize={fontSize}
            padding={padding}
            places={dynamicPlaces.length > 0 ? dynamicPlaces : [1]} // Ensure places is not empty
            fontWeight={fontWeight}
            gradientHeight={gradientHeight}
            {...rest}
          />
        </div>
      )}
      <div style={buttonRowStyle}>
        <button type="button" onClick={decrement} style={buttonStyle}>-</button>
        <button type="button" onClick={increment} style={buttonStyle}>+</button>
      </div>
    </div>
  );
};
