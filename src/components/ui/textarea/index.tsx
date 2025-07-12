import {
  forwardRef, useImperativeHandle,
  useLayoutEffect, useRef
}                                   from 'react';
import styles                       from './styles.module.css';


const Textarea = forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => {
    const internalRef = useRef<HTMLTextAreaElement | null>(null);

    // This combines the forwarded ref with our internal ref.
    // This allows us to both control the component from outside and have our own internal logic.
    useImperativeHandle(ref, () => internalRef.current as HTMLTextAreaElement);

    useLayoutEffect(() => {
      const textarea = internalRef.current;
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    }, [props.value]);

    return (
      <textarea
        ref={internalRef}
        rows={1}
        className={`${styles['textarea']} ${className || ''}`}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';


export default Textarea;
