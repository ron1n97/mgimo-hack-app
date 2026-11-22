"""Smoke tests for digest curation rules."""

from curate_digest_events import curate_row, polish_title


def test_polish_title_does_not_space_letters():
    assert polish_title("Битва факультетов 2026") == "Битва факультетов 2026"


def test_greeting_becomes_model_title():
    row = {
        "id": "1",
        "club": "КГУ",
        "title": "Уважаемые читатели!",
        "body": "Регистрация на Модель Совета Безопасности Российской Федерации продлена до 22.11.",
    }
    out = curate_row(row)
    assert out["verdict"] == "APPROVED"
    assert out["title"] == "Модель Совета Безопасности РФ"
    assert "Уважаемые" not in out["title"]


def test_reject_city_afisha():
    row = {
        "id": "2",
        "title": "Афиша: куда пойти любителю книг с 16 по 22 ноября",
        "body": "В книжных лавках Москвы проходят встречи с писателями.",
    }
    assert curate_row(row)["verdict"] == "REJECTED"


def test_hockey_match_title():
    row = {
        "id": "3",
        "title": "А Вы готовы готовы почувствовать тот самый дух бастиона студенческой дружбы?",
        "body": "ХК «Дипломаты» МГИМО vs ХК «Чёрные вороны» ВШЭ. Дата: 22 ноября, вход свободный.",
    }
    out = curate_row(row)
    assert out["verdict"] == "APPROVED"
    assert "Дипломаты" in out["title"]


def test_business_breakfast_topic():
    row = {
        "id": "4",
        "title": "Экономический клуб МГИМО OECONOMICUS им. А.В. Макаренко приглашает всех на бизнес-завтрак на тему",
        "body": "MBA для крупного бизнеса: как определить эффективность образования. Спикер Власов.",
    }
    out = curate_row(row)
    assert out["verdict"] == "APPROVED"
    assert "MBA" in out["title"] or "завтрак" in out["title"].lower()
