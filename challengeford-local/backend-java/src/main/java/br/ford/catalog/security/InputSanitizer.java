package br.ford.catalog.security;

import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

@Component
public class InputSanitizer {

    private static final Pattern SCRIPT_BLOCK =
            Pattern.compile("<script[^>]*>.*?</script>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern HTML_TAGS =
            Pattern.compile("<[^>]*>", Pattern.CASE_INSENSITIVE);
    private static final Pattern SQL_INJECTION =
            Pattern.compile("(--|;|/\\*|\\*/|xp_|DROP\\s|INSERT\\s|UPDATE\\s|DELETE\\s|SELECT\\s|UNION\\s)",
                    Pattern.CASE_INSENSITIVE);

    public String sanitize(String input) {
        if (input == null) return null;
        String result = SCRIPT_BLOCK.matcher(input).replaceAll("");
        result = HTML_TAGS.matcher(result).replaceAll("");
        result = SQL_INJECTION.matcher(result).replaceAll("");
        return result.trim();
    }
}
