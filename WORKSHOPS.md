# Adding workshops

The Classes page reads `data/workshops.json`. It starts intentionally empty so Parkerly does not publish fabricated classes.

Each real workshop is one object with these fields:

```json
{
  "title": "",
  "category": "build",
  "instructor": "",
  "instructor_role": "",
  "ages": "",
  "date": "",
  "time": "",
  "duration": "",
  "price": "",
  "spots": "",
  "status": "Open",
  "image": "",
  "booking_url": ""
}
```

Allowed categories: `build`, `bake`, `create`, `adventure`, `perform`, `discover`.

Next: connect this file to a friendly CMS so Courtney never has to edit JSON manually.
