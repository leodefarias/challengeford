package br.ford.catalog.security;

import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

@Component
public class InputSanitizer {

    private static final int MAX_INPUT_LENGTH = 2000;

    private static final Pattern SCRIPT_BLOCK =
            Pattern.compile("<script[^>]*>.*?</script>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern HTML_TAGS =
            Pattern.compile("<[^>]*>", Pattern.CASE_INSENSITIVE);
    private static final Pattern SQL_INJECTION =
            Pattern.compile(
                "(--|;|/\\*|\\*/|xp_|"
                + "DROP[\\s\\r\\n]+|INSERT[\\s\\r\\n]+|UPDATE[\\s\\r\\n]+|"
                + "DELETE[\\s\\r\\n]+|SELECT[\\s\\r\\n]+|UNION[\\s\\r\\n]+|"
                + "EXEC(?:UTE)?[\\s\\r\\n(]|"
                + "OR[\\s\\r\\n]+'[^']*'[\\s\\r\\n]*='[^']*'|"
                + "OR[\\s\\r\\n]+\\d+[\\s\\r\\n]*=[\\s\\r\\n]*\\d+|"
                + "'[\\s\\r\\n]*--)",
                Pattern.CASE_INSENSITIVE);

    public String sanitize(String input) {
        if (input == null) return null;
        String result = input.length() > MAX_INPUT_LENGTH
                ? input.substring(0, MAX_INPUT_LENGTH)
                : input;
        result = SCRIPT_BLOCK.matcher(result).replaceAll("");
        result = HTML_TAGS.matcher(result).replaceAll("");
        result = SQL_INJECTION.matcher(result).replaceAll("");
        return result.trim();
    }
}
