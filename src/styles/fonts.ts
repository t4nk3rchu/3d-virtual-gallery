// Fonts for the "Tranh Việt" world (see DESIGN.md). Vietnamese-first stack.
// Display + reading serif are self-hosted Vietnamese foundry faces; UI + mono +
// the reading fallback come from @fontsource (each weight carries the vietnamese
// subset with unicode-range, so diacritics load on demand).
import './local-fonts.css';
// UTM Dragon Fire (display) + MJ Modern (reading serif) load via local-fonts.css.
// Merriweather — reading fallback (supplies punctuation MJ Modern lacks) + weights
import '@fontsource/merriweather/400.css';
import '@fontsource/merriweather/700.css';
import '@fontsource/merriweather/400-italic.css';
// Be Vietnam Pro — UI (labels, buttons, navigation)
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
// JetBrains Mono — technical / status readouts
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
