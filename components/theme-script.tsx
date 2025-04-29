"use client"

export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          try {
            const theme = localStorage.getItem('theme') || 
              (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
            const bgColor = theme === 'dark' ? '#000' : '#fff';
            document.documentElement.style.backgroundColor = bgColor;
            document.body.style.backgroundColor = bgColor;
            document.documentElement.classList.add(theme);
          } catch (e) {}
        `,
      }}
    />
  )
} 