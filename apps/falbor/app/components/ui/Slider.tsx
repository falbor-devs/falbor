import { motion } from "framer-motion";
import { memo } from "react";
import { classNames } from "~/utils/classNames";
import { cubicEasingFn } from "~/utils/easings";
import { genericMemo } from "~/utils/react";

export type SliderOptions<T> = {
  left: {
    value: T;
    text: string;
    icon?: string | JSX.Element;
    disabled?: boolean;
  };
  middle?: {
    value: T;
    text: string;
    icon?: string | JSX.Element;
    disabled?: boolean;
  };
  right: {
    value: T;
    text: string;
    icon?: string | JSX.Element;
    disabled?: boolean;
  };
  extra?: {
    value: T;
    text: string;
    icon?: string | JSX.Element;
    disabled?: boolean;
  };
  extra2?: {
    value: T;
    text: string;
    icon?: string | JSX.Element;
    disabled?: boolean;
  };
};

interface SliderProps<T> {
  selected: T;
  options: SliderOptions<T>;
  setSelected?: (selected: T) => void;
  showLabels?: boolean;
  showIcons?: boolean;
}

export const Slider = genericMemo(
  <T,>({
    selected,
    options,
    setSelected,
    showLabels = true,
    showIcons = true,
  }: SliderProps<T>) => {
    const hasMiddle = !!options.middle;
    const isLeftSelected = selected === options.left.value;
    const isMiddleSelected =
      hasMiddle && options.middle ? selected === options.middle.value : false;
    const isRightSelected = selected === options.right.value;
    const isExtraSelected = options.extra
      ? selected === options.extra.value
      : false;
    const isExtra2Selected = options.extra2
      ? selected === options.extra2.value
      : false;

    return (
      <div
        className="flex items-center shrink-0 gap-1 border dark:border-falbor-elements-borderColor overflow-x-auto rounded-md p-1 max-w-full"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style>{`
        .overflow-x-auto::-webkit-scrollbar {
          display: none;
        }
      `}</style>
        <SliderButton
          selected={isLeftSelected}
          disabled={options.left.disabled}
          icon={options.left.icon}
          showIcon={showIcons}
          showLabel={showLabels}
          setSelected={() => setSelected?.(options.left.value)}
        >
          {options.left.text}
        </SliderButton>

        {options.middle && (
          <SliderButton
            selected={isMiddleSelected}
            disabled={options.middle.disabled}
            icon={options.middle.icon}
            showIcon={showIcons}
            showLabel={showLabels}
            setSelected={() => setSelected?.(options.middle!.value)}
          >
            {options.middle.text}
          </SliderButton>
        )}

        <SliderButton
          selected={isRightSelected}
          disabled={options.right.disabled}
          icon={options.right.icon}
          showIcon={showIcons}
          showLabel={showLabels}
          setSelected={() => setSelected?.(options.right.value)}
        >
          {options.right.text}
        </SliderButton>

        {options.extra && (
          <SliderButton
            selected={isExtraSelected}
            disabled={options.extra.disabled}
            icon={options.extra.icon}
            showIcon={showIcons}
            showLabel={showLabels}
            setSelected={() => setSelected?.(options.extra!.value)}
          >
            {options.extra.text}
          </SliderButton>
        )}

        {options.extra2 && (
          <SliderButton
            selected={isExtra2Selected}
            disabled={options.extra2.disabled}
            icon={options.extra2.icon}
            showIcon={showIcons}
            showLabel={showLabels}
            setSelected={() => setSelected?.(options.extra2!.value)}
          >
            {options.extra2.text}
          </SliderButton>
        )}
      </div>
    );
  },
);

interface SliderButtonProps {
  selected: boolean;
  disabled?: boolean;
  children: string | JSX.Element | Array<JSX.Element | string>;
  icon?: string | JSX.Element;
  showIcon: boolean;
  showLabel: boolean;
  setSelected: () => void;
}

const SliderButton = memo(
  ({
    selected,
    disabled,
    children,
    icon,
    showIcon,
    showLabel,
    setSelected,
  }: SliderButtonProps) => {
    return (
      <button
        onClick={setSelected}
        disabled={disabled}
        className={classNames(
          "bg-transparent text-sm px-3 md:px-2.5 py-1.5 md:py-0.5 rounded-full relative whitespace-nowrap flex-shrink-0",
          disabled
            ? "cursor-not-allowed text-falbor-elements-item-contentDefault opacity-40"
            : selected
              ? "text-falbor-elements-item-contentAccent"
              : "text-falbor-elements-item-contentDefault hover:text-falbor-elements-item-contentActive",
        )}
      >
        <span className="relative z-10 flex items-center gap-1">
          {showIcon &&
            icon &&
            (typeof icon === "string" ? <div className={icon} /> : icon)}
          {showLabel && children}
        </span>
        {selected && (
          <motion.span
            layoutId="pill-tab"
            transition={{ duration: 0.2, ease: cubicEasingFn }}
            className="absolute inset-0 z-0 bg-falbor-elements-item-backgroundAccent rounded-md"
          ></motion.span>
        )}
      </button>
    );
  },
);
