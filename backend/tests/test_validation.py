from app.schemas import FieldSchema, ConditionalRule
from app.validation import validate_submission

NAME_FIELD = FieldSchema(id="name", type="text", label="Name", required=True)
AGE_FIELD = FieldSchema(id="age", type="number", label="Age", required=True)
PLAN_FIELD = FieldSchema(
    id="plan", type="select", label="Plan", required=True, options=["basic", "pro"]
)
COMPANY_FIELD = FieldSchema(
    id="company",
    type="text",
    label="Company name",
    required=True,
    conditional=ConditionalRule(field="plan", equals="pro"),
)


def test_valid_submission_passes():
    result = validate_submission([NAME_FIELD, AGE_FIELD], {"name": "Monica", "age": 34})
    assert result.valid
    assert result.errors == []


def test_missing_required_field_fails():
    result = validate_submission([NAME_FIELD], {"name": ""})
    assert not result.valid
    assert result.errors[0].field == "name"


def test_wrong_type_fails():
    result = validate_submission([AGE_FIELD], {"age": "not-a-number"})
    assert not result.valid
    assert "number" in result.errors[0].message


def test_select_rejects_value_outside_options():
    result = validate_submission([PLAN_FIELD], {"plan": "enterprise"})
    assert not result.valid


def test_conditional_field_required_when_condition_met():
    result = validate_submission(
        [PLAN_FIELD, COMPANY_FIELD], {"plan": "pro", "company": ""}
    )
    assert not result.valid
    assert result.errors[0].field == "company"


def test_conditional_field_skipped_when_condition_not_met():
    result = validate_submission(
        [PLAN_FIELD, COMPANY_FIELD], {"plan": "basic", "company": ""}
    )
    assert result.valid  # company isn't required because plan != "pro"
