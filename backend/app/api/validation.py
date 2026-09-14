import re
from datetime import datetime


# ============================================================
# AADHAAR / GENERAL IDENTITY VALIDATION
# ============================================================

def extract_information(text: str) -> dict:
    """
    Extract basic identity information from OCR text.
    """

    text = text.replace("\n", " ")
    text = re.sub(r"\s+", " ", text)

    # --------------------------------------------------------
    # DOB
    # --------------------------------------------------------

    dob_match = re.search(
        r"\b\d{2}[/-]\d{2}[/-]\d{4}\b",
        text,
    )

    dob = dob_match.group() if dob_match else ""

    # --------------------------------------------------------
    # ID NUMBER
    # --------------------------------------------------------

    id_match = re.search(
        r"\b\d{4}\s\d{4}\s\d{4}\b",
        text,
    )

    id_number = (
        id_match.group()
        if id_match
        else ""
    )

    # --------------------------------------------------------
    # NAME
    # --------------------------------------------------------

    name = ""

    name_match = re.search(
        r"(?:Name|नाम)\s*[:\-]?\s*"
        r"([A-Za-z]+(?:\s+[A-Za-z]+){1,3})",
        text,
        re.IGNORECASE,
    )

    if name_match:
        name = name_match.group(1).strip()

    return {
        "name": name,
        "dob": dob,
        "id_number": id_number,
    }


def validate_information(data: dict) -> dict:
    """
    Validate extracted Aadhaar/general identity fields.
    """

    name = data.get("name", "")
    dob = data.get("dob", "")
    id_number = data.get("id_number", "")

    name_status = (
        "PASS"
        if name
        else "FAIL"
    )

    dob_status = (
        "PASS"
        if re.fullmatch(
            r"\d{2}[/-]\d{2}[/-]\d{4}",
            dob,
        )
        else "FAIL"
    )

    id_status = (
        "PASS"
        if re.fullmatch(
            r"\d{4}\s\d{4}\s\d{4}",
            id_number,
        )
        else "FAIL"
    )

    passed = sum(
        [
            name_status == "PASS",
            dob_status == "PASS",
            id_status == "PASS",
        ]
    )

    score = (
        passed / 3
    ) * 100

    return {
        "name": name_status,
        "dob": dob_status,
        "id_number": id_status,
        "score": score,
    }


# ============================================================
# PASSPORT FIELD EXTRACTION
# ============================================================

def extract_passport_information(
    text: str,
) -> dict:
    """
    Extract passport fields from OCR text.
    """

    # --------------------------------------------------------
    # DATES
    # --------------------------------------------------------

    dates = re.findall(
        r"\b\d{2}[-/]\d{2}[-/]\d{4}\b",
        text,
    )

    dates = [
        value.replace("/", "-")
        for value in dates
    ]

    dob = dates[0] if len(dates) > 0 else ""
    issue_date = dates[1] if len(dates) > 1 else ""
    expiry_date = dates[2] if len(dates) > 2 else ""

    # --------------------------------------------------------
    # CARD NUMBER
    # --------------------------------------------------------

    card_numbers = re.findall(
        r"\b\d{9}\b",
        text,
    )

    card_number = (
        card_numbers[0]
        if card_numbers
        else ""
    )

    # --------------------------------------------------------
    # PERSONAL NUMBER
    # --------------------------------------------------------

    personal_numbers = re.findall(
        r"\b[A-Z0-9]{10}\b",
        text.upper(),
    )

    personal_number = (
        personal_numbers[0]
        if personal_numbers
        else ""
    )

    # --------------------------------------------------------
    # SEX
    # --------------------------------------------------------

    sex_match = re.search(
        r"\b(F|M)\b",
        text.upper(),
    )

    sex = (
        sex_match.group(1)
        if sex_match
        else ""
    )

    # --------------------------------------------------------
    # NAME
    # --------------------------------------------------------

    lines = [
        line.strip()
        for line in text.splitlines()
        if line.strip()
    ]

    surname = ""
    given_name = ""

    for index, line in enumerate(lines):

        lower = line.lower()

        # ----------------------------------------------------
        # SURNAME
        # ----------------------------------------------------

        if "surname" in lower:

            for j in range(
                index + 1,
                min(index + 3, len(lines)),
            ):

                value = lines[j].strip(
                    " :.-"
                )

                if any(
                    label in value.lower()
                    for label in [
                        "given name",
                        "nationality",
                        "place of birth",
                        "date of birth",
                        "sex",
                        "card no",
                    ]
                ):
                    continue

                if re.search(
                    r"[A-Za-zÀ-ÿ]",
                    value,
                ):
                    surname = value
                    break

        # ----------------------------------------------------
        # GIVEN NAME
        # ----------------------------------------------------

        if "given name" in lower:

            parts = re.split(
                r"given name",
                line,
                maxsplit=1,
                flags=re.IGNORECASE,
            )

            if len(parts) > 1:

                value = parts[1].strip(
                    " :.-()"
                )

                if re.search(
                    r"[A-Za-zÀ-ÿ]{2,}",
                    value,
                ):
                    given_name = value

            if given_name == "":

                for j in range(
                    index + 1,
                    min(index + 3, len(lines)),
                ):

                    value = lines[j].strip(
                        " :.-"
                    )

                    if any(
                        label in value.lower()
                        for label in [
                            "nationality",
                            "place of birth",
                            "date of birth",
                            "sex",
                            "card no",
                        ]
                    ):
                        continue

                    if re.search(
                        r"[A-Za-zÀ-ÿ]{2,}",
                        value,
                    ):
                        given_name = value
                        break

    surname = re.sub(
        r"[^A-Za-zÀ-ÿ' -]",
        "",
        surname,
    ).strip()

    given_name = re.sub(
        r"[^A-Za-zÀ-ÿ' -]",
        "",
        given_name,
    ).strip()

    return {
        "surname": surname,
        "given_name": given_name,
        "date_of_birth": dob,
        "date_of_issue": issue_date,
        "date_of_expiry": expiry_date,
        "card_number": card_number,
        "sex": sex,
        "personal_number": personal_number,
    }


# ============================================================
# PASSPORT VALIDATION
# ============================================================

def _valid_date(value: str) -> bool:
    try:
        datetime.strptime(
            value,
            "%d-%m-%Y",
        )
        return True

    except ValueError:
        return False


def validate_passport(
    fields: dict,
) -> tuple[dict, float]:
    """
    Validate passport OCR fields.
    """

    results = {}

    # --------------------------------------------------------
    # NAME
    # --------------------------------------------------------

    results["Surname"] = bool(
        re.fullmatch(
            r"[A-Za-zÀ-ÿ' -]+",
            fields.get("surname", ""),
        )
    )

    results["Given Name"] = bool(
        re.fullmatch(
            r"[A-Za-zÀ-ÿ' -]+",
            fields.get("given_name", ""),
        )
    )

    # --------------------------------------------------------
    # DATES
    # --------------------------------------------------------

    results["Date of Birth"] = _valid_date(
        fields.get("date_of_birth", "")
    )

    results["Date of Issue"] = _valid_date(
        fields.get("date_of_issue", "")
    )

    results["Date of Expiry"] = _valid_date(
        fields.get("date_of_expiry", "")
    )

    # --------------------------------------------------------
    # CARD NUMBER
    # --------------------------------------------------------

    results["Card Number"] = bool(
        re.fullmatch(
            r"\d{9}",
            fields.get("card_number", ""),
        )
    )

    # --------------------------------------------------------
    # SEX
    # --------------------------------------------------------

    results["Sex"] = (
        fields.get("sex", "").upper()
        in ["M", "F"]
    )

    # --------------------------------------------------------
    # PERSONAL NUMBER
    # --------------------------------------------------------

    results["Personal Number"] = bool(
        re.fullmatch(
            r"[A-Z0-9]{10}",
            fields.get(
                "personal_number",
                "",
            ).upper(),
        )
    )

    # --------------------------------------------------------
    # DATE CONSISTENCY
    # --------------------------------------------------------

    try:

        dob = datetime.strptime(
            fields["date_of_birth"],
            "%d-%m-%Y",
        )

        issue = datetime.strptime(
            fields["date_of_issue"],
            "%d-%m-%Y",
        )

        expiry = datetime.strptime(
            fields["date_of_expiry"],
            "%d-%m-%Y",
        )

        results["Issue After Birth"] = (
            issue >= dob
        )

        results["Expiry After Issue"] = (
            expiry > issue
        )

    except (
        KeyError,
        ValueError,
    ):

        results["Issue After Birth"] = False
        results["Expiry After Issue"] = False

    # --------------------------------------------------------
    # SCORE
    # --------------------------------------------------------

    passed = sum(results.values())
    total = len(results)

    percentage = (
        passed / total * 100
        if total
        else 0
    )

    return results, percentage


# ============================================================
# AADHAAR VERHOEFF CHECKSUM
# ============================================================

def validate_aadhaar_checksum(
    aadhaar_no: str,
) -> bool:

    if (
        not aadhaar_no.isdigit()
        or len(aadhaar_no) != 12
    ):
        return False

    d = [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
        [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
        [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
        [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
        [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
        [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
        [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
        [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
        [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
    ]

    p = [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
        [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
        [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
        [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
        [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
        [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
        [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
        [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
        [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
    ]

    inv = [
        0, 4, 3, 2, 1,
        5, 6, 7, 8, 9,
    ]

    checksum = 0

    for i, digit in enumerate(aadhaar_no):
        checksum = d[
            checksum
        ][
            p[(i + 1) % 8][int(digit)]
        ]

    return inv[checksum] == 0